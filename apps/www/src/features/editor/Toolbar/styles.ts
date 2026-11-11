import styled from "styled-components";

export const StyledToolElement = styled.button<{ $hide?: boolean; $highlight?: boolean }>`
  display: ${({ $hide }) => ($hide ? "none" : "flex")};
  align-items: center;
  gap: 4px;
  place-content: center;
  font-size: 14px;
  background: ${({ $highlight }) =>
    $highlight ? "linear-gradient(rgba(0, 0, 0, 0.1) 0 0)" : "none"};
  color: var(--workbench-muted, ${({ theme }) => theme.INTERACTIVE_NORMAL});
  min-height: 38px;
  padding: 6px 8px;
  border-radius: 8px;
  white-space: nowrap;

  &:hover {
    background: var(--workbench-tint, rgba(0, 0, 0, 0.1));
    color: var(--workbench-ink, ${({ theme }) => theme.INTERACTIVE_HOVER});
    opacity: 1;
    box-shadow: none;
  }
`;
