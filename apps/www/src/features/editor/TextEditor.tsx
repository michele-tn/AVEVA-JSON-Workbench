import React, { useCallback } from "react";
import { LoadingOverlay } from "@mantine/core";
import styled from "styled-components";
import Editor, { type EditorProps, loader, type OnMount, useMonaco } from "@monaco-editor/react";
import { getNodeValue, parseTree, type JSONPath, type Node, type ParseError } from "jsonc-parser";
import { FileFormat } from "../../enums/file.enum";
import useConfig from "../../store/useConfig";
import useFile from "../../store/useFile";
import useJson from "../../store/useJson";
import useGraph from "./views/GraphView/stores/useGraph";

loader.config({
  paths: {
    vs: "/vendor/monaco/vs",
  },
});

const editorOptions: EditorProps["options"] = {
  tabSize: 2,
  formatOnType: true,
  minimap: { enabled: false },
  stickyScroll: { enabled: false },
  scrollBeyondLastLine: false,
  placeholder: "Start typing...",
};

function findSourceNode(root: Node, path: JSONPath) {
  let node: Node | undefined = root;
  for (const segment of path) {
    if (typeof segment === "number") {
      node = node?.type === "array" ? node.children?.[segment] : undefined;
    } else {
      node =
        node?.type === "object"
          ? node.children?.findLast(property => property.children?.[0]?.value === segment)
              ?.children?.[1]
          : undefined;
    }
  }
  return node?.parent?.type === "property" ? node.parent : node;
}

const TextEditor = () => {
  const monaco = useMonaco();
  const contents = useFile(state => state.contents);
  const setContents = useFile(state => state.setContents);
  const setError = useFile(state => state.setError);
  const jsonSchema = useFile(state => state.jsonSchema);
  const getHasChanges = useFile(state => state.getHasChanges);
  const theme = useConfig(state => (state.darkmodeEnabled ? "vs-dark" : "light"));
  const fileType = useFile(state => state.format);
  const graphJson = useJson(state => state.json);
  const selectedPath = useGraph(state => state.selectedNode?.path);
  const hoveredPath = useGraph(state => state.hoveredNode?.path);
  const [editor, setEditor] = React.useState<Parameters<OnMount>[0]>();
  const hasReference = Boolean(selectedPath || hoveredPath);
  const sourceTree = React.useMemo(() => {
    if (!hasReference || fileType !== FileFormat.JSON) return;
    const errors: ParseError[] = [];
    const tree = parseTree(contents, errors);
    if (tree && !errors.length && JSON.stringify(getNodeValue(tree), null, 2) === graphJson) {
      return tree;
    }
  }, [contents, fileType, graphJson, hasReference]);
  const toRange = useCallback(
    (path?: JSONPath) => {
      const model = editor?.getModel();
      if (!monaco || !model || !sourceTree || model.getValue() !== contents) return;

      const node = path && findSourceNode(sourceTree, path);
      if (!node) return;
      const start = model.getPositionAt(node.offset);
      const end = model.getPositionAt(node.offset + node.length);
      return monaco.Range.fromPositions(start, end);
    },
    [contents, editor, monaco, sourceTree]
  );
  const selectedRange = React.useMemo(() => toRange(selectedPath), [selectedPath, toRange]);
  const hoveredRange = React.useMemo(() => toRange(hoveredPath), [hoveredPath, toRange]);
  const jsonDefaults = (monaco?.languages as any)?.json?.jsonDefaults as
    { setDiagnosticsOptions: (options: unknown) => void } | undefined;

  React.useEffect(() => {
    if (!jsonDefaults) return;

    jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: true,
      enableSchemaRequest: true,
      ...(jsonSchema && {
        schemas: [
          {
            uri: "http://myserver/foo-schema.json",
            fileMatch: ["*"],
            schema: jsonSchema,
          },
        ],
      }),
    });
  }, [jsonDefaults, jsonSchema]);

  React.useEffect(() => {
    const beforeunload = (e: BeforeUnloadEvent) => {
      if (getHasChanges()) {
        const confirmationMessage =
          "Unsaved changes, if you leave before saving  your changes will be lost";

        (e || window.event).returnValue = confirmationMessage; //Gecko + IE
        return confirmationMessage;
      }
    };

    window.addEventListener("beforeunload", beforeunload);

    return () => {
      window.removeEventListener("beforeunload", beforeunload);
    };
  }, [getHasChanges]);

  const handleMount: OnMount = useCallback(editor => {
    setEditor(editor);
    editor.onDidPaste(() => {
      editor.getAction("editor.action.formatDocument")?.run();
    });
  }, []);

  React.useEffect(() => {
    if (editor && selectedRange) editor.setSelection(selectedRange);
  }, [editor, selectedRange]);

  React.useEffect(() => {
    if (!editor || !monaco) return;
    const decorations = editor.createDecorationsCollection([
      ...(selectedRange
        ? [{ range: selectedRange, options: { className: "graph-source-selected" } }]
        : []),
      ...(hoveredRange
        ? [{ range: hoveredRange, options: { className: "graph-source-hovered" } }]
        : []),
    ]);
    const range = hoveredRange ?? selectedRange;
    if (range) {
      editor.revealPositionInCenterIfOutsideViewport(
        range.getStartPosition(),
        monaco.editor.ScrollType.Immediate
      );
    }
    return () => decorations.clear();
  }, [editor, hoveredRange, monaco, selectedRange]);

  return (
    <StyledEditorWrapper>
      <StyledWrapper>
        <Editor
          height="100%"
          language={fileType}
          theme={theme}
          value={contents}
          options={editorOptions}
          onMount={handleMount}
          onValidate={errors => setError(errors[0]?.message || "")}
          onChange={contents => setContents({ contents, skipUpdate: true })}
          loading={<LoadingOverlay visible />}
        />
      </StyledWrapper>
    </StyledEditorWrapper>
  );
};

export default TextEditor;

const StyledEditorWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  user-select: none;

  .graph-source-selected {
    background: #3b82f64d;
  }

  .graph-source-hovered {
    background: #14b8a640;
    border-bottom: 1px solid #0d9488;
  }
`;

const StyledWrapper = styled.div`
  display: grid;
  height: 100%;
  grid-template-columns: 100%;
  grid-template-rows: minmax(0, 1fr);
`;
