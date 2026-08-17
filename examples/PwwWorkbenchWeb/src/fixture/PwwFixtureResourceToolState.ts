import { ref } from "vue";
import {
  pnwNormalizeDockableToolState,
  type PnwDockableToolDefinition,
} from "phoenix-wing";

export const PWW_FIXTURE_RESOURCE_TOOL = {
  id: "fixture.resource-library",
  title: "工程资源库",
  scope: "application",
  frame: {
    ownerKind: "tool",
    movable: true,
    resizable: "both",
    recommendedSize: { width: 720, height: 520 },
    minSize: { width: 400, height: 300 },
    rememberBounds: true,
    closeBehavior: "close",
  },
} as const satisfies PnwDockableToolDefinition;

export const pwwFixtureResourceToolState = ref(pnwNormalizeDockableToolState());
