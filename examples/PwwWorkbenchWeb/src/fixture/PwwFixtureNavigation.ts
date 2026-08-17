import type { PnwNavigationNode } from "phoenix-wing";

/** 同一份 fixture 同时交给 Ribbon 与 Tree，不生成第二份菜单。 */
export const PWW_FIXTURE_NAVIGATION = [
  {
    id: "workspace",
    label: "工作空间",
    shortLabel: "工作",
    icon: "⌂",
    order: 10,
    children: [
      {
        id: "workspace-overview",
        label: "空间概览",
        children: [
          { id: "home", label: "主页", icon: "pnw:home", order: 5 },
          { id: "dashboard", label: "综合看板", icon: "pnw:dashboard", order: 10 },
          { id: "models", label: "模型目录", icon: "pnw:list", order: 20 },
        ],
      },
      {
        id: "workspace-data",
        label: "数据维护",
        children: [
          { id: "bom", label: "BOM 工作台", icon: "⌘", order: 10 },
          { id: "import", label: "批量导入", icon: "⇩", order: 20, disabled: true },
          { id: "draft", label: "隐藏草稿", hidden: true },
        ],
      },
    ],
  },
  {
    id: "development",
    label: "研发工具",
    shortLabel: "研发",
    icon: "⌬",
    order: 20,
    children: [
      {
        id: "development-code",
        label: "代码生成",
        order: 10,
        children: [
          { id: "codegen", label: "参数代码", icon: "pnw:report", order: 10 },
          { id: "validation", label: "规则检查", order: 20 },
          { id: "detached-view", label: "完整 View 浮出", icon: "pnw:window-float", order: 30 },
          { id: "result-preview", label: "结果预览 View", icon: "pnw:window-float", order: 40 },
          { id: "dockable-tool", label: "可停靠资源工具", icon: "pnw:folder", order: 50 },
        ],
      },
    ],
  },
  {
    id: "collaboration",
    label: "协同管理",
    shortLabel: "协同",
    icon: "◎",
    order: 30,
    children: [
      {
        id: "collaboration-issues",
        label: "问题跟踪",
        children: [
          { id: "issues", label: "Open Issue", icon: "pnw:history" },
        ],
      },
    ],
  },
  {
    id: "system",
    label: "系统",
    shortLabel: "系统",
    icon: "⚙",
    order: 40,
    children: [
      {
        id: "system-workbench",
        label: "工作台配置",
        children: [
          { id: "workbench-layout", label: "导航布局", icon: "≡", order: 10 },
        ],
      },
    ],
  },
] as const satisfies readonly PnwNavigationNode[];
