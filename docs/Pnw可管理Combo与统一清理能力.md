# Pnw 可管理 Combo 与统一清理能力

状态：current

Owner：Phoenix Wing maintainers

适用版本：0.7.x 本地候选

最后核验：2026-09-08

## 目标与边界

本轮把多个插件重复需要的“可管理下拉列表”和“预览—确认—执行清理”收敛为 Wing 能力，
使 VS Code、Tauri 或其他 Web Host 复用一致的 UI、契约和 Node 文件系统实现。

Wing 不保存业务项目状态、不选择持久化介质，也不调用 VS Code API。Host 仍负责：

- 把项目、仓库和工作目录投影为可选择目标；
- 把机器配置或项目配置读写到正确的存储；
- 决定哪些清理方式可见，以及执行完成后的日志、通知和刷新；
- Windows PowerShell 脚本的生成、保存和实际脚本专属步骤。

## `PnwCombo`

`@phoenix-wing/code-core/ui` 公开 `<pnw-combo>`、`PnwComboModel` 和
`pnw-combo-action`。它用于“选择一项，同时管理候选”的场景，不替代简单枚举
`PnwSelect`：

- 候选可按来源分组；
- 每行保留独立删除动作和禁用原因；
- 可选底部“全部清空”；
- 只发出 `select / remove / clear` 语义事件，Host 决定真实删除与持久化；
- 下拉浮层以 viewport 和滚动裁剪祖先的交集为可见边界，空间不足时自动向上展开，
  并在内部滚动，不要求用户先移动整个面板。

这与只编辑一个字符串的 `PnwComboTextInput`、只选字典项的 `PnwDictSelect` 语义不同，
因此不合并已有控件。

## `PnwCleanupDialog`

`@phoenix-wing/code-core/ui` 公开 `<pnw-cleanup-dialog>`、模型和
`pnw-cleanup-dialog-action`。对话框只呈现 Host 模型并发出语义事件：

- 清理方式可声明普通或高风险，并可按方式控制规则编辑器是否显示；
- 目标支持多选，也可声明仅适用于某些清理方式；
- 用户切换方式时，组件会自动选择该方式当前可用的目标，并清空旧预览；Host 可用
  `showModal(modeId)` 直接打开指定方式，也可通过 `selectedModeId` 投影初始方式；
- 规则文本、实际命中清单、执行状态和错误由 Host 投影；
- `execute` 必须绑定 Host 返回的不透明 preview token；
- 高风险方式默认要求用户在 ready 预览后再次勾选确认；preview token 改变时确认自动失效。
- `PnwCleanupDialogModel.requireHighRiskConfirmation` 默认 `true`，现有消费者行为不变。Run 可明确传 `false`，仅省略额外风险 checkbox；不得把方式伪装为普通风险，`risk: "high"` 标记、方式/目标、有效 ready preview token 与显式清理按钮仍必需，改变方式或目标仍清空旧预览。

因此 `git reset --hard HEAD + git clean -ffdx` 不再作为无预览的普通按钮。它可以成为
对话框中的高风险方式，但必须经过精确仓库预览；AutoBuild 继续保留默认二次勾选确认。

## 规则与 Node 执行能力

`@phoenix-wing/run-core` 公开受限 YAML 规则解析与文件名匹配。默认规则为：

```yaml
delete:
  directories:
    - objects
    - build
  files:
    - '*.obj'
    - '*.exp'
    - '*.pdb'
    - 'test_*.exe'
```

规则只匹配清理根目录的直属子项；拒绝路径、`..`、`**` 和文件系统根目录，不递归搜索
未知位置。目录命中后会冻结完整且不跟随符号链接的树。

`@phoenix-wing/run-node` 公开三类“先预览再执行”能力：

1. 规则产物清理：冻结根目录身份、每个候选身份和完整目录树；执行前逐项复验，只删除
   被确认的顶层候选。确认后新出现的匹配文件不会被顺带删除。
2. Git 强制清理：只接受 Git 顶层；冻结目录身份、HEAD、tracked status、tracked binary
   diff 和 `git clean -ndfx` 清单；复验一致后执行 `git reset --hard HEAD`，再次复验，再执行
   `git clean -ffdx`。
3. 目录内容清空：冻结某个安全目录的所有直属子项，保留目录本身，不跟随目录链接，
   并跳过其直属 `.git`。它用于 CMake 共享 `build` 目录等“保留容器、只清内容”场景；
   执行仍只删除用户确认过的冻结清单。

两类执行都提供 Host 协作取消钩子。Node 包不弹窗、不记配置、不写日志；这些仍由 Host 完成。

## AutoBuild 首个消费者约定

KT Auto Code 的 AutoBuild Primary 将在“脚本 / 预检配置 / 启动 / 停止”动作区增加“清理”，
由它打开统一对话框。现有常驻“清理仓库”和“手动清理 Root”块在能力迁入对话框后删除，
不是删除功能：

- ROOT 与工作目录的规则清理进入目标列表；
- Git 强制恢复进入高风险方式；
- CMake 清理继续作为一种目标/方式被追踪，不能因 UI 收敛而丢失；
- 原有脚本同步、Windows PowerShell 保存/导出及脚本专属执行继续保留。

## 验收

- `PnwCombo` 覆盖分组、逐行删除、全部清空、语义事件、上/下自动避让与裁剪祖先。
- `PnwCleanupDialog` 覆盖模型归一化、目标/规则投影、preview token、默认高风险二次确认及 Run 省略额外勾选后的同等预览门禁。
- Rule Core 覆盖默认/兼容 YAML、非法路径、大小写和长度边界。
- Node 覆盖直属项限制、预览后新增项、身份替换、完整树冻结、符号链接、取消、根目录拒绝、
  Git 实际 reset/clean 及预览后变化拒绝。
- 消费者完成 sibling Wing 来源门禁和真实 Extension Host 操作后，才可宣布集成通过。
