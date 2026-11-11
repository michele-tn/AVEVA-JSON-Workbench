import { Group } from "@mantine/core";
import styled from "styled-components";
import toast from "react-hot-toast";
import { AiOutlineFullscreen } from "react-icons/ai";
import { FaGithub } from "react-icons/fa6";
import { PROJECT_REPOSITORY } from "../../../constants/project";
import { FileMenu } from "./FileMenu";
import { ThemeToggle } from "./ThemeToggle";
import { ToolsMenu } from "./ToolsMenu";
import { ViewMenu } from "./ViewMenu";
import { StyledToolElement } from "./styles";

const StyledTools = styled.nav`
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  gap: 4px;
  justify-content: space-between;
  flex-shrink: 0;
  min-height: 46px;
  padding: 4px clamp(8px, 3vw, 32px);
  background: var(--workbench-panel);
  color: var(--workbench-ink);
  z-index: 36;
  border-bottom: 1px solid var(--workbench-line);
`;

function fullscreenBrowser() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {
      toast.error("Unable to enter fullscreen mode.");
    });
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}

export const Toolbar = () => {
  return (
    <StyledTools aria-label="Editor toolbar">
      <Group gap={4} wrap="nowrap">
        <FileMenu />
        <ViewMenu />
        <ToolsMenu />
      </Group>
      <Group gap={4} wrap="nowrap">
        <ThemeToggle />
        <StyledToolElement
          as="a"
          href={PROJECT_REPOSITORY}
          aria-label="AVEVA JSON Workbench on GitHub"
          rel="noopener"
          target="_blank"
        >
          <FaGithub size="18" />
        </StyledToolElement>
        <StyledToolElement
          type="button"
          aria-label="Toggle browser fullscreen"
          onClick={fullscreenBrowser}
        >
          <AiOutlineFullscreen size="20" />
        </StyledToolElement>
      </Group>
    </StyledTools>
  );
};
