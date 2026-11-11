import React from "react";
import type { ModalProps } from "@mantine/core";
import { Alert, Button, Group, Loader, Modal, Select, Stack, Switch, Text } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import { useMediaQuery } from "@mantine/hooks";
import styled from "styled-components";
import { event as gaEvent } from "nextjs-google-analytics";
import { FileFormat } from "../../../enums/file.enum";
import { contentToJson } from "../../../lib/utils/jsonAdapter";
import useFile from "../../../store/useFile";

const typeOptions = [
  { label: "TypeScript", value: "typescript", lang: "typescript" },
  { label: "TypeScript (combined)", value: "typescript/typealias", lang: "typescript" },
  { label: "Go", value: "go", lang: "go" },
  { label: "JSON Schema", value: "json_schema", lang: "json" },
  { label: "Kotlin", value: "kotlin", lang: "kotlin" },
  { label: "Rust", value: "rust", lang: "rust" },
];

type Result = { code: string } | { error: string };

async function generateTypes(contents: string, format: FileFormat, mode: string): Promise<Result> {
  if (!contents.trim()) return { error: "Add data to the editor to generate types." };

  let json: string;
  try {
    // Preserve the source's numeric tokens when the document is already JSON.
    const parsed = await contentToJson(contents, format);
    if (parsed === undefined) return { error: "Add data to the editor to generate types." };
    json = format === FileFormat.JSON ? contents : JSON.stringify(parsed);
  } catch {
    return { error: "Correct the document in the editor, then try again." };
  }

  try {
    if (mode === "go") {
      const [{ default: jsonToGo }, { default: formatGo }] = await Promise.all([
        import("../../../lib/utils/json2go"),
        import("gofmt.js"),
      ]);
      const result = jsonToGo(json);
      if (!result.go) return { error: result.error || "Go requires a JSON object or array." };
      return { code: formatGo(result.go) };
    }
    const { run } = await import("json_typegen_wasm");
    return { code: run("Root", json, JSON.stringify({ output_mode: mode })) };
  } catch {
    return { error: "This language could not generate types for the current document." };
  }
}

const Preview = styled.div`
  min-height: min(180px, 32dvh);
  max-height: min(54dvh, 620px);
  overflow: auto;
  border: 1px solid var(--mantine-color-default-border);
  border-radius: var(--mantine-radius-md);
  background: var(--mantine-color-body);

  pre {
    margin: 0;
    padding: 14px 16px;
    font-size: 14px;
    line-height: 1.65;
    tab-size: 2;
  }

  &[data-wrap="true"] pre,
  &[data-wrap="true"] code {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
`;

function TypePreview({
  contents,
  format,
  mode,
}: {
  contents: string;
  format: FileFormat;
  mode: string;
}) {
  const [result, setResult] = React.useState<Result>();
  const [wrap, setWrap] = React.useState(true);
  const [notice, setNotice] = React.useState("");
  const preview = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let active = true;
    void generateTypes(contents, format, mode).then(result => {
      if (active) setResult(result);
    });
    return () => {
      active = false;
    };
  }, [contents, format, mode]);

  if (!result) {
    return (
      <Group role="status" mih={90}>
        <Loader size="sm" />
        <Text size="sm">Generating types…</Text>
      </Group>
    );
  }
  if ("error" in result)
    return (
      <Alert color="yellow" role="alert">
        {result.error}
      </Alert>
    );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.code);
      setNotice("Copied to clipboard.");
    } catch {
      const code = preview.current?.querySelector("code");
      const selection = window.getSelection();
      if (!code || !selection) {
        setNotice("Select and copy the code manually.");
        return;
      }
      preview.current?.focus();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      setNotice("Code selected. Press Ctrl+C or use your device’s copy command.");
    }
  };

  return (
    <>
      <Group justify="space-between">
        <Text fw={600} size="sm">
          Generated code
        </Text>
        <Group gap="sm">
          <Switch
            size="xs"
            label="Wrap lines"
            checked={wrap}
            onChange={event => setWrap(event.currentTarget.checked)}
          />
          <Button type="button" size="compact-sm" variant="light" onClick={copy}>
            Copy code
          </Button>
        </Group>
      </Group>
      <Preview
        ref={preview}
        role="region"
        aria-label="Generated code"
        tabIndex={0}
        data-wrap={wrap}
      >
        <CodeHighlight
          code={result.code}
          language={typeOptions.find(option => option.value === mode)?.lang}
          withCopyButton={false}
        />
      </Preview>
      {notice && (
        <Text size="sm" role="status">
          {notice}
        </Text>
      )}
    </>
  );
}

export const TypeModal = ({ opened, onClose }: ModalProps) => {
  const contents = useFile(state => state.contents);
  const format = useFile(state => state.format);
  const [mode, setMode] = React.useState("typescript");
  const compact = useMediaQuery("(max-width: 600px)");

  return (
    <Modal
      title="Generate Types"
      size="min(880px, 96vw)"
      opened={opened}
      onClose={onClose}
      centered
      fullScreen={compact}
    >
      <Stack gap="sm">
        <Select
          label="Output language"
          value={mode}
          data={typeOptions}
          allowDeselect={false}
          onChange={value => {
            if (!value) return;
            setMode(value);
            gaEvent("generate_type", { label: value });
          }}
        />
        {opened && (
          <TypePreview
            key={JSON.stringify([format, mode, contents])}
            contents={contents}
            format={format}
            mode={mode}
          />
        )}
      </Stack>
    </Modal>
  );
};
