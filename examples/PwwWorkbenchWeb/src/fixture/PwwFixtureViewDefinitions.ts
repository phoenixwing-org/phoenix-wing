export type PwwFixtureViewKind =
  | "summary"
  | "catalog"
  | "codegen"
  | "inspection"
  | "issue";

export interface PwwFixtureViewDefinition {
  readonly kind: PwwFixtureViewKind;
  readonly title: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly subtitle?: string;
  readonly primaryTitle?: string;
  readonly secondaryTitle?: string;
  readonly bottomTitle?: string;
}

export const PWW_FIXTURE_VIEWS: Readonly<Record<string, PwwFixtureViewDefinition>> = {
  dashboard: {
    kind: "summary",
    title: "综合看板",
    eyebrow: "常用工作台 View",
    description: "默认使用 Primary 承载筛选与属性摘要，并按需贡献 Bottom；不为简单属性额外占用右侧宽度。",
    primaryTitle: "项目筛选",
    bottomTitle: "运行与诊断",
  },
  models: {
    kind: "catalog",
    title: "模型目录",
    eyebrow: "复杂目录 View",
    description: "贡献 Primary，并允许用户从 Footer 按需打开独立 Secondary 检查器。",
    primaryTitle: "模型树",
    secondaryTitle: "选中模型",
  },
  bom: {
    kind: "inspection",
    title: "BOM 工作台",
    eyebrow: "数据 View",
    description: "贡献 Primary 与可调 Bottom Panel，Secondary 不占位。",
    primaryTitle: "装配结构",
    bottomTitle: "查询结果",
  },
  codegen: {
    kind: "codegen",
    title: "参数代码",
    eyebrow: "工具 View",
    subtitle: "PNXTemplateBaseParam.json · PNXTemplate · UTF-8",
    description: "用公共页眉组合文件摘要、主动作和紧凑工具条；页面业务命令仍由 consumer 处理。",
    primaryTitle: "生成参数",
    bottomTitle: "生成报告",
  },
  validation: {
    kind: "inspection",
    title: "规则检查",
    eyebrow: "验证 View",
    description: "只贡献 Bottom Panel，左右两侧保持完整 Editor 宽度。",
    bottomTitle: "问题列表",
  },
  "workbench-layout": {
    kind: "summary",
    title: "导航分组布局",
    eyebrow: "宿主配置 View",
    description: "在独立 View 中显示并调整大分组关系；不把信息架构编辑塞进外观浮动面板。",
  },
  issues: {
    kind: "issue",
    title: "Open Issue",
    eyebrow: "Issue 风格 View",
    description: "当前 View 不贡献 Primary、Secondary 或 Bottom，因此不会生成空面板或 Footer 图标。",
  },
};

export const PWW_FIXTURE_FALLBACK_VIEW: PwwFixtureViewDefinition = {
  kind: "summary",
  title: "Fixture 页面",
  eyebrow: "最小 View",
  description: "该节点没有产品 API，只展示工作台 Editor slot。",
};
