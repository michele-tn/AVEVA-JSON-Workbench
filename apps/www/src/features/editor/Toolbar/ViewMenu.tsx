import { Menu, Flex, SegmentedControl } from "@mantine/core";
import { event as gaEvent } from "nextjs-google-analytics";
import { CgChevronDown } from "react-icons/cg";
import { ViewMode } from "../../../enums/viewMode.enum";
import { useViewMode } from "../../../hooks/useViewMode";
import { StyledToolElement } from "./styles";

export const ViewMenu = () => {
  const [viewMode, setViewMode] = useViewMode();

  return (
    <Menu shadow="md" closeOnItemClick={false} withArrow>
      <Menu.Target>
        <StyledToolElement onClick={() => gaEvent("show_view_menu")}>
          <Flex align="center" gap={3}>
            View <CgChevronDown />
          </Flex>
        </StyledToolElement>
      </Menu.Target>
      <Menu.Dropdown>
        <SegmentedControl
          size="md"
          w="100%"
          value={viewMode}
          onChange={e => {
            setViewMode(e as ViewMode);
            gaEvent("change_view_mode", { label: e });
          }}
          data={[
            { value: ViewMode.Graph, label: "Graph" },
            { value: ViewMode.Tree, label: "Tree" },
          ]}
          fullWidth
          orientation="vertical"
        />
      </Menu.Dropdown>
    </Menu>
  );
};
