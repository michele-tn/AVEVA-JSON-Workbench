import { useState } from "react";
import { Button, CopyButton, Group, Modal, Text, Textarea } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import styled from "styled-components";
import { LuArrowUpRight, LuClipboard, LuClipboardCheck } from "react-icons/lu";
import { FileFormat } from "../../enums/file.enum";
import { encodeAvevaJson } from "../../lib/utils/encodeAvevaJson";
import useFile from "../../store/useFile";

const OutputActions = styled.section`
  flex-shrink: 0;
  padding: 10px 12px;
  border-top: 1px solid var(--workbench-line);
  background: var(--workbench-panel);
`;

const OutputField = styled(Textarea)`
  textarea {
    background: var(--mantine-color-body);
    font:
      13px/1.6 ui-monospace,
      "Cascadia Code",
      Consolas,
      monospace;
    overflow-wrap: anywhere;

    @media (max-width: 480px) {
      font-size: 16px;
    }
  }
`;

export const AvevaOutput = () => {
  const [output, setOutput] = useState("");
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState("");
  const compact = useMediaQuery("(max-width: 480px)");

  const generate = () => {
    const { contents, format } = useFile.getState();
    if (format !== FileFormat.JSON) {
      setError("Select JSON in the editor format menu before generating.");
      return;
    }

    try {
      setOutput(encodeAvevaJson(contents));
      setError("");
      setOpened(true);
    } catch (error) {
      setError(
        error instanceof TypeError
          ? error.message
          : "Correct the JSON in the editor before generating AVEVA output."
      );
    }
  };

  return (
    <>
      <OutputActions aria-label="AVEVA export">
        <Group justify="space-between" gap="xs">
          <Text size="sm" fw={700}>
            AVEVA output
          </Text>
          <Button
            type="button"
            size="compact-sm"
            variant="light"
            color="teal"
            rightSection={<LuArrowUpRight size={15} aria-hidden="true" />}
            aria-haspopup="dialog"
            onClick={generate}
          >
            Generate AVEVA output
          </Button>
        </Group>
        {error && (
          <Text role="alert" size="xs" mt={4} c="red">
            {error}
          </Text>
        )}
      </OutputActions>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="AVEVA output"
        size="lg"
        radius="lg"
        centered
        fullScreen={compact}
        returnFocus
        overlayProps={{ backgroundOpacity: 0.62, blur: 4 }}
      >
        <Text size="sm" c="dimmed" mb="sm">
          Copy this value and paste it back into Wonderware.
        </Text>
        <OutputField
          label="AVEVA-compatible output"
          value={output}
          readOnly
          rows={6}
          data-autofocus
        />
        <Group justify="flex-end" mt="md">
          <Button type="button" variant="default" onClick={() => setOpened(false)}>
            Close
          </Button>
          <CopyButton value={output}>
            {({ copied, copy }) => (
              <Button
                type="button"
                color="teal"
                leftSection={
                  copied ? (
                    <LuClipboardCheck aria-hidden="true" />
                  ) : (
                    <LuClipboard aria-hidden="true" />
                  )
                }
                onClick={copy}
                aria-live="polite"
              >
                {copied ? "Copied" : "Copy AVEVA output"}
              </Button>
            )}
          </CopyButton>
        </Group>
      </Modal>
    </>
  );
};
