import {
  pnwCreateViewContributionRegistry,
  type PnwViewBlockComponentContributions,
} from "phoenix-wing";

/** fixture consumer 自己持有注册表实例；Wing 不创建全局页面状态。 */
export const PWW_FIXTURE_VIEW_BLOCK_REGISTRY =
  pnwCreateViewContributionRegistry<PnwViewBlockComponentContributions>();

export const PWW_FIXTURE_EMPTY_VIEW_BLOCKS: PnwViewBlockComponentContributions =
  Object.freeze({});
