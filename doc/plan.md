# Phoenix Wing 当前路线

状态：current

Owner：Phoenix Wing maintainers

适用版本：0.5.x

当前仓库版本已准备为 `0.5.2` 本地候选，用于承载工作台 Web 架构与动态 View Block 调整；尚未执行 npm 发布，现有消费者继续以各自 manifest 中的已发布精确版本为准。

最后核验：2026-07-28

## 已完成基线

- 八个 npm 发布单元已在 0.4.3 锁步公开发布；聚合包 Registry manifest 仅引用精确的 0.4.3 内部依赖，不含 `workspace:`、`link:` 或 `file:`。
- 注释标签 `0.4.3` 已封签到最终候选 `5211504` 并推送远端；Auto Code 0.5.1 与 Auto CAD 0.1.0 曾完成 Registry 消费、Marketplace 公开发布与人工审查。
- `code-core`、`kt-codegen`、CAD contracts/core、workspace schema、Node DB adapter 和 Rust source 已有真实消费者。
- Auto Code/Auto CAD、Desk Tools 与 Open Issue 均从 Registry 消费 Wing；各仓不使用相邻目录 override，当前精确版本由各自的 manifest、lockfile 和依赖门禁维护。
- 完整 workspace 测试、类型检查、release matrix、TypeScript/Rust tarball smoke 已进入 `pnpm verify:ci`。
- 聚合 UI 编译入口、跨宿主契约、两项纯能力 fixture 与消费者验证均已进入制品门禁；0.4.2 归档、Registry 和七个消费者结果见[《0.4.2 本地候选与公开发布验收》](0.4.2发布候选验收.md)。
- 大型 UI 分阶段拆分已经启动；Wing 的 `KtCodegenTable` 首轮治理已完成：领域编辑在 Core、布局与动作投影在无 DOM ViewModel、主题/滚动视觉规则在内部 Style，Web Component 保留单一 DOM renderer、焦点/事件接线与 Host 事件投影；`contained|page` 布局和公共 disclosure 属性/事件已经落地，公共 tag、数据方法和 browser 子路径保持稳定。

旧 Phase 1–9、框架迁移、组件改进、多包迁移和单 block 迁移文档是实施证据，不再承担当前操作指导；分类见 [`document-manifest.json`](document-manifest.json)。

## 当前优先级

1. **[已完成：0.5.0 锁步发布]** 新增 Git/Run 四个发布包，并纳入 KtCodegen Workbench UI 与 CAD FCStd BOM XML 能力；12 个发布物已统一提升到 0.5.0，完成全量门禁、中文提交、pnpm 发布与 Registry 干净消费。下一步依次升级 Auto Code 0.6.0 和 Desk Tools；Open Issue 本轮不动。
2. **[已完成：核心平台基线]** Apply、UUID/GUID、workspace path、32 个 Renderer family、跨宿主 golden fixture、聚合 UI 单出口与 AST/import graph 均由 Wing 保持真源，Auto/Desk/Open Issue 已通过 Registry 0.4.2 验证；原八条重复完成项合并由本条追踪。
3. **[已完成：0.4.3 功能范围]** Marker 在下一 Start/End 边界恢复并输出结构化诊断；仅 `missing-end`/`orphan-end` 时可安全应用其余完整区域；`KtCodegenTable` 已完成 ViewModel/Style 分层、`contained|page`、disclosure 与高对比选中态治理，公共入口保持兼容。
4. **[进行中：PnwEditorDrawerHost 第二消费者验证]** Wing 已公开发布 `PnwEditorDrawerHost`、关闭守卫契约与单元测试。下一步由 Phoenix Open Issue 使用已发布的 `phoenix-wing@0.5.1` Registry 包，在 Issue 新建/编辑场景完成第二个真实消费者验证；验证完成后再判断公共契约是否稳定。

   - [x] 定义 `view/create/edit` 模式、可选标题/工具/页脚插槽、加载状态、左右停靠、宽度与移动端响应式回退。
   - [x] 定义 dirty 状态、同步/异步关闭守卫、防重复关闭请求、Esc/遮罩关闭和 Element Plus 焦点行为。
   - [x] 定义工作台身份：`editorId`/`pageId`/`tabId`/`resourceKey`，状态仍由各消费者逐实例持有，避免 Host 形成第二份业务状态。
   - [x] 业务表单、DTO、API、权限判断和领域校验留在消费者；Wing 只提供容器、生命周期契约、插槽和状态事件。
   - [x] 首个真实消费者已完成两处抽屉的本地候选验收；其业务表单保持在消费者仓库，Wing 只维护容器与契约。
   - [ ] Phoenix Open Issue 以 Issue 新建/编辑场景作为第二个真实消费者，精确使用 Registry `phoenix-wing@0.5.1`；复用抽屉契约但不共享业务表单。
   - [ ] 在 Open Issue 完成 Registry 验证后，检查 dirty 关闭保护、多 Tab 状态隔离、独立路由回退和键盘操作，再决定是否宣布公共契约稳定。

5. **[进行中：Pnw Web 工作台 W4 双消费者验证]** W0–W3 的仓内架构、fixture、视觉与交互增补已完成；下一步以 Open Issue 验证简单消费者、Phoenix Admin 验证复杂消费者，比较后才冻结或继续调整公共契约。执行边界、分支、端口和门禁见[《Pnw 工作台 Web 双消费者验证计划》](Pnw工作台Web双消费者验证计划.md)，架构结果见[《Pnw 工作台 Web 架构与示例计划》](Pnw工作台Web架构与示例计划.md)。

   - [x] 记录增补需求与边界：SVG 品牌真源归 Wing，图标资源只接纳至少两个 Web 消费者共有的壳层动作。
   - [x] 完成 Admin Host、BOM Studio、Open Issue、Desk Tools 图标用法盘点，记录设置、折叠、面板、关闭/更多及六类导航动作的重复证据；产品/领域图标不迁入。
   - [x] 建立 `PnwIcon` 首批 16 个矢量资源，替换 Wing/fixture 内联重复；消费者业务仓只记录后续迁移点，不在本任务改动。
   - [x] 将高层 Ribbon 外观整理为“大 Ribbon / 紧凑工具条”两类同形嵌套设置；共用一个数据类型，各自保存状态，紧凑模式使用时忽略分组标签。
   - [x] 紧凑工具条高度只跟随 16/24px 图标收缩为约 28/34px；Title 仅横向呈现，不改变同尺寸工具条高度。
   - [x] Header 一级大分组只投影当前分组的 Ribbon 内容；移除重复的竖排模块名，以 `3px` 非交互句柄分隔当前分组内模块。
   - [x] fixture 演示将包含 Open Issue 的“问题跟踪”小模块整体移入工作空间和恢复默认布局；默认树、当前树与持久化继续由宿主负责，公共拖拽协议留待 W4 双消费者确认。
   - [x] 工具树提供受控目录/Activity Rail 双态，Rail 复用原末级节点并以图标或标题首字呈现。
   - [x] 设置入口改用可移动 modeless 面板；位置由宿主/fixture Pinia 受控，Wing 纯函数负责越界修正且不持久化偏好。
   - [x] 将设置收紧为 420px 单列折叠检查器并限制高度滚动；Header 一级分组支持节点短标签、紧凑间距和受限区域横向滚动，7–8 个分组不挤占页面标签。
   - [x] 将大分组与小模块归属从浮动外观面板拆到“系统 / 工作台配置 / 导航布局”第一方 fixture consumer View；使用可折叠分组表格、移动下拉、内置/自定义分组、新建/删除、全名/简称/顺序编辑与分层恢复，Wing 不新增产品管理协议。
   - [x] 保留 Ribbon 右侧内置 `…` 与 Tree 底部显示入口；快捷菜单使用单行 PnwIcon 预设，“完整显示设置…”打开 Wing 公共可移动对话框。consumer 可追加 action 信号和对话框界面 slot，但不复制公共表单；Header 右侧只暴露 consumer action slot。
   - [x] fixture Pinia store 持有当前布局并导出版本化纯数据偏好（自定义分组、模块归属/排序）；整棵导航树及 Vue 图标不序列化，前端存储或 Admin 后端数据库均由消费者 adapter 决定。
   - [x] 无打开 View 时 Header 不再保留空页签带，右侧操作区仍贴齐；Wing 不自动打开默认页或决定空编辑器内容。
   - [x] 只读核对 Admin Host、BOM Studio、Open Issue、Desk Tools 的入口装配，增加受控 `PnwWorkbenchShell` 与旧 `PnwRibbonTabDef[]` 导航投影；fixture 的 `App.vue` 收敛为一个壳层引用，Router、权限、页面注册和持久化仍归宿主。
   - [x] 将 Primary / Editor / Secondary / Bottom 收敛为一个受控 `PnwWorkbenchLayoutState`；三个显式 separator 更新宿主持有的宽高，Bottom 只从顶边调高，不再暴露浏览器右下角 resize。
   - [x] Bottom Panel 支持消费者控制的多 Tab；fixture 演示问题/运行日志，Desk Tools/Admin 的面板注册和内容生命周期仍留在产品 adapter。
   - [x] Shell 增加可覆盖的 Phoenix 默认品牌和空 View；关闭最后一个页面标签会移除旧 View，消费者可替换空状态。示例设置、Editor 和 CSS 已从原千行 `App.vue` 拆分。
   - [x] 对照 BOM Studio 与 Desk Tools 的页面级 Primary registry，提炼 consumer 隔离的泛型 View contribution 生命周期；`PnwWorkbenchShell` 可动态装配当前 View 的三个 Block。`PwwWorkbenchWeb` 的 App 不再内置 Block 内容或展开三十余个 controller 变量，示例实现统一隔离在 `src/fixture/PwwFixture*`。
   - [x] 形成 Phoenix Admin 渐进适配映射：沿用 Admin 的权限菜单、Router、process/keep-alive 与 Pinia/后端持久化，只用薄 `Pah*` adapter 投影导航、Tab、布局和 Bottom contributions；本轮不改 Admin。
   - [x] Open Issue 已在独立分支完成第一轮本地 Wing 壳层接入、Footer/Bottom 与快捷显示设置验证，manifest 和 lockfile 仍保持 Registry 精确依赖。
   - [ ] Open Issue 补齐真实 View contribution、关闭生命周期和窄屏回归，作为 W4 简单消费者证据。
   - [ ] Phoenix Admin 在当前 dirty 工作归档后建立独立适配分支，保留 classic/workbench/hybrid 回退，以薄 `Pah*` adapter 验证权限树、process tabs、动态 Block 和布局偏好。
   - [ ] 比较两个消费者，只把共同且稳定的最小差异回收到 Wing；之后再决定契约冻结、BOM Studio/Desk Tools 针对性验证和版本发布。
   - [ ] 决定窄屏 Tree 的最终语义：当前 Activity Rail 虽已收窄，响应式容器仍作为 Editor 上方整行占高；待 W4 比较“图标轨 + 临时抽屉”和“保持左侧列”后再实现。
   - [x] 通过单元测试、typecheck、build、文档门禁，并在内置浏览器验证 light/dark/custom、桌面/窄屏和 `16/24/36/48/64px` SVG 清晰度。

Auto Code 已随 0.5.1 接入 `KtCodegenTable` 的 page/disclosure API；下一优先级是 Desk Tools 的 Registry 0.4.3 升级与消费验收。Windows NSIS 回执由用户手工并行，不阻塞本阶段代码目标。

后期条件 TODO：只有出现第二个 DOM renderer/消费者，或出现可复现的渲染、焦点、dirty 事件维护缺陷时，才继续提炼 DOM renderer / action adapter。当前 577 行 Web Component 剩余职责内聚，继续为降行数拆分会增加焦点、折叠和事件顺序风险。

大型 UI 拆分不改变 0.4.x 公共兼容门禁：Registry 消费、发布客户端限制、tarball、公共协议与真实宿主行为必须持续通过。

## 变更规则

- 公共能力必须先有第二个真实消费者或明确的跨宿主契约。
- 发布版本与协议由 `release-matrix.json` 维护；消费者当前精确版本由各消费仓库维护，不在 Wing 中复制。
- 测试数量和 bundle 大小由 CI 产出；当前文档只描述门禁范围，不手写易漂移计数。
- 完成态计划转为 archived；被新真源替代的文档标为 superseded，并保留跳转关系至少一个发布周期。
