import { Card, Overlay, Stack, Text } from "@mantine/core";
import useConfig from "../../../../store/useConfig";

export const NotSupported = () => {
  const darkmodeEnabled = useConfig(state => state.darkmodeEnabled);

  return (
    <Overlay backgroundOpacity={0.6} color={darkmodeEnabled ? "#111" : "#e2f0f3"} blur="3" center>
      <Card maw={380} p="lg" radius="md" withBorder>
        <Stack gap="xs" ta="center">
          <Text fw={700}>This graph exceeds the node limit</Text>
          <Text size="sm" c="dimmed">
            Switch to Tree view or reduce the document size.
          </Text>
        </Stack>
      </Card>
    </Overlay>
  );
};
