import React from "react";
import styled from "styled-components";
import { ViewMode } from "../../enums/viewMode.enum";
import { useViewMode } from "../../hooks/useViewMode";
import { GraphView } from "./views/GraphView";
import { TreeView } from "./views/TreeView";

const StyledLiveEditor = styled.div`
  position: relative;
  height: 100%;
  background: ${({ theme }) => theme.GRID_BG_COLOR};
  overflow: auto;

  & > ul {
    margin-top: 0 !important;
    padding: 12px !important;
    font-family: monospace;
    font-size: 14px;
    font-weight: 500;
  }

  .tab-group {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 2;
  }
`;

const View = () => {
  const [viewMode] = useViewMode();

  if (viewMode === ViewMode.Graph) return <GraphView />;
  if (viewMode === ViewMode.Tree) return <TreeView />;
  return null;
};

const LiveEditor = () => {
  return (
    <StyledLiveEditor onContextMenuCapture={e => e.preventDefault()}>
      <View />
    </StyledLiveEditor>
  );
};

export default LiveEditor;
