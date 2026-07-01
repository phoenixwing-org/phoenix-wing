/** 壳层布局状态 — 消费项目通过扩展此接口提供实现 */
export interface PnwShellLayout {
  workspace_tree_dock?: "left" | "right";
  shell_log_dock?: "left" | "right";
  properties_panel_dock?: "left" | "right";
  git_commit_panel_dock?: "left" | "right";
  workset_panel_dock?: "left" | "right";
  right_panel_open?: boolean;
  log_panel_open?: boolean;
  properties_panel_open?: boolean;
  git_commit_panel_open?: boolean;
  workset_panel_open?: boolean;
}

export type PnwSideDock = "left" | "right";

export interface PnwSideDockVisibility {
  leftVisible: boolean;
  rightVisible: boolean;
  leftShowTree: boolean;
  leftShowCaaTree: boolean;
  leftShowLog: boolean;
  leftShowProps: boolean;
  leftShowGitCommit: boolean;
  leftShowWorkset: boolean;
  rightShowTree: boolean;
  rightShowLog: boolean;
  rightShowProps: boolean;
  rightShowGitCommit: boolean;
  rightShowWorkset: boolean;
}

export interface PnwSideDockVisibilityContext {
  onGitPage?: boolean;
  onCaaPage?: boolean;
}

export function pnwGitCommitPanelDock(layout: PnwShellLayout): PnwSideDock {
  const dock = layout.git_commit_panel_dock;
  if (dock === "left" || dock === "right") return dock;
  return layout.properties_panel_dock ?? "right";
}

export function pnwSideDockVisibility(
  layout: PnwShellLayout,
  ctx: PnwSideDockVisibilityContext = {},
): PnwSideDockVisibility {
  const treeLeft = layout.workspace_tree_dock === "left";
  const treeRight = layout.workspace_tree_dock === "right";
  const logLeft = layout.shell_log_dock === "left";
  const logRight = layout.shell_log_dock === "right";
  const propsLeft = layout.properties_panel_dock === "left";
  const propsRight = layout.properties_panel_dock === "right";
  const gitLeft = pnwGitCommitPanelDock(layout) === "left";
  const gitRight = pnwGitCommitPanelDock(layout) === "right";
  const wsLeft = (layout.workset_panel_dock || "right") === "left";
  const wsRight = (layout.workset_panel_dock || "right") === "right";
  const treeOpen = layout.right_panel_open ?? false;
  const logOpen = layout.log_panel_open ?? false;
  const propsOpen = layout.properties_panel_open ?? false;
  const gitOpen = Boolean(ctx.onGitPage) && Boolean(layout.git_commit_panel_open);
  const wsOpen = layout.workset_panel_open ?? false;

  const leftShowTree = treeLeft && treeOpen;
  const leftShowCaaTree = Boolean(ctx.onCaaPage);
  const leftShowLog = logLeft && logOpen;
  const leftShowProps = propsLeft && propsOpen;
  const leftShowGitCommit = gitLeft && gitOpen;
  const leftShowWorkset = wsLeft && wsOpen;
  const rightShowTree = treeRight && treeOpen;
  const rightShowLog = logRight && logOpen;
  const rightShowProps = propsRight && propsOpen;
  const rightShowGitCommit = gitRight && gitOpen;
  const rightShowWorkset = wsRight && wsOpen;

  return {
    leftVisible: leftShowTree || leftShowCaaTree || leftShowLog || leftShowProps || leftShowGitCommit || leftShowWorkset,
    rightVisible: rightShowTree || rightShowLog || rightShowProps || rightShowGitCommit || rightShowWorkset,
    leftShowTree,
    leftShowCaaTree,
    leftShowLog,
    leftShowProps,
    leftShowGitCommit,
    leftShowWorkset,
    rightShowTree,
    rightShowLog,
    rightShowProps,
    rightShowGitCommit,
    rightShowWorkset,
  };
}
