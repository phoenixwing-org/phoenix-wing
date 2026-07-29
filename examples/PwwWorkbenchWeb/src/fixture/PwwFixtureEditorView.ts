import type { PnwActivityBarPresentation } from "phoenix-wing";
import type { PwwFixtureViewDefinition } from "./PwwFixtureViewDefinitions.js";

/** fixture 专用的 Editor View 输入；真实消费者应换成自己的 Router/领域状态。 */
export interface PwwFixtureEditorViewProps {
  readonly view: PwwFixtureViewDefinition;
  readonly activeNodeId: string;
  readonly presentation: PnwActivityBarPresentation;
  readonly ribbonSummary: string;
  readonly themeSummary: string;
}
