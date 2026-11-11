import { useRef, useState } from "react";
import { Button, Group, Textarea } from "@mantine/core";
import styled from "styled-components";
import { LuCircleAlert, LuCircleCheck, LuClipboardPaste, LuFlaskConical } from "react-icons/lu";
import { FileFormat } from "../../enums/file.enum";
import { normalizeAvevaJson } from "../../lib/utils/normalizeAvevaJson";
import useFile from "../../store/useFile";

const SAMPLE =
  '"[{""filter"":true,""editable"":false,""readOnly"":true},{""filter"":true,""editable"":true,""readOnly"":false,""cellStyle"":{""whiteSpace"":""normal"",""lineHeight"":""16px""}}]"';

const Intake = styled.div`
  flex-shrink: 0;
  padding: 12px;
  border-bottom: 1px solid var(--workbench-line);
  background: var(--workbench-panel);

  label {
    color: var(--workbench-ink);
    font-weight: 700;
  }

  textarea {
    margin-top: 5px;
    border-color: var(--workbench-line);
    background: var(--workbench-subtle);
    color: var(--workbench-ink);
    font:
      13px/1.55 ui-monospace,
      "Cascadia Code",
      Consolas,
      monospace;
    font-size: 16px;
    resize: vertical;
    min-height: 76px;
    max-height: min(22dvh, 175px);

    &::placeholder {
      color: var(--workbench-muted);
    }

    &:focus {
      border-color: var(--workbench-accent);
    }

    &[aria-invalid="true"] {
      border-color: var(--mantine-color-red-6);
    }
  }

  @media (min-width: 761px) {
    textarea {
      font-size: 13px;
    }
  }
`;

const Status = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 7px;
  min-height: 20px;
  margin-top: 8px;
  color: var(--workbench-muted);
  font-size: 12px;
  line-height: 1.45;

  svg {
    flex-shrink: 0;
    margin-top: 1px;
  }

  &[data-state="loaded"] {
    color: var(--workbench-accent);
  }

  &[data-state="invalid"] {
    color: var(--mantine-color-error);
  }
`;

export const AvevaInput = () => {
  const setContents = useFile(state => state.setContents);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loaded" | "invalid">("idle");

  const loadInput = (value: string) => {
    setInput(value);
    if (!value.trim()) {
      setStatus("idle");
      return;
    }

    try {
      const contents = normalizeAvevaJson(value);
      setContents({ contents, format: FileFormat.JSON });
      setStatus("loaded");
    } catch {
      setStatus("invalid");
    }
  };

  return (
    <Intake>
      <Textarea
        ref={fieldRef}
        label="AVEVA Wonderware JSON"
        description="Paste an AVEVA string or standard JSON to update the editor and preview."
        placeholder="Paste your JSON here"
        aria-describedby="aveva-input-status"
        error={status === "invalid"}
        rows={3}
        spellCheck={false}
        value={input}
        onChange={event => loadInput(event.currentTarget.value)}
      />
      <Group gap="xs" mt={8}>
        <Button
          type="button"
          size="compact-sm"
          variant="light"
          color="teal"
          leftSection={<LuFlaskConical size={15} aria-hidden="true" />}
          onClick={() => loadInput(SAMPLE)}
        >
          Load example
        </Button>
        <Button
          type="button"
          size="compact-sm"
          variant="subtle"
          color="gray"
          disabled={!input}
          onClick={() => {
            loadInput("");
            fieldRef.current?.focus();
          }}
        >
          Clear input
        </Button>
      </Group>
      <Status id="aveva-input-status" role="status" data-state={status}>
        {status === "idle" && (
          <>
            <LuClipboardPaste size={15} aria-hidden="true" /> Ready for input
          </>
        )}
        {status === "loaded" && (
          <>
            <LuCircleCheck size={15} aria-hidden="true" /> Normalized JSON loaded in the editor.
          </>
        )}
        {status === "invalid" && (
          <>
            <LuCircleAlert size={15} aria-hidden="true" /> Invalid or incomplete JSON. The preview
            still shows the last valid document.
          </>
        )}
      </Status>
    </Intake>
  );
};
