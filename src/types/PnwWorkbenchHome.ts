import type { PnwIconId } from "./PnwIcon.js";
import type { PnwViewPresentationContribution } from "./PnwViewPresentation.js";

/** Host 可映射到自身 Router/View registry 的中立 Home 元数据。 */
export interface PnwWorkbenchHomeDefinition {
  readonly viewId: string;
  readonly title: string;
  readonly iconId: PnwIconId;
  readonly isHome: true;
  readonly presentation: PnwViewPresentationContribution;
}

export interface PnwCreateWorkbenchHomeDefinitionOptions {
  readonly viewId?: string;
  readonly title?: string;
  readonly iconId?: PnwIconId;
}
