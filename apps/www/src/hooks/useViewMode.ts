import { useSessionStorage } from "@mantine/hooks";
import { ViewMode } from "../enums/viewMode.enum";

export const useViewMode = () =>
  useSessionStorage({ key: "viewMode", defaultValue: ViewMode.Graph });
