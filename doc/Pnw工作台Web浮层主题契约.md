# Pnw 工作台 Web · 浮层主题契约

状态：current

Owner：Phoenix Wing maintainers

适用版本：Wing 0.6.2（已发布）

## 1. 问题与边界

Wing 工作台的 light/dark token 位于布局局部树，`Teleport to="body"` 后不会继续继承。此前
`PnwChoiceDialogHost` 还优先读取 `--page-bg / --text / --border-strong`，因此深色工作台可出现白色
确认框。Element Plus 的 `el-dialog` 同样只读取 `html/body` 的 `--el-*`，不能由插件页面各写一套
补丁。

0.6.2 将职责固定为：

- Wing 负责解析 scheme、统一 Wing Teleport theme root 和 `--pnw-workbench-*` token；
- Host 负责把自己的主题真源同步给 Wing，并同步 Element Plus 的 `html.dark / --el-*`；
- 插件只调用全局 dialog 或 Wing 浮层组件，不维护 dark CSS，也不修改全局 path/button。

## 2. 公共契约

`pnwApplyColorScheme(scheme)` 仍兼容原调用，并新增两项行为：

1. 在 `document.documentElement` 写入解析后的 `data-theme` 与 `data-pnw-color-scheme`；
2. 通知所有未显式指定 scheme 的 `PnwOverlayThemeProvider`。

`PnwOverlayThemeProvider` 是公开的 Teleport 根主题组件，输出：

- `data-pnw-overlay-theme-root`；
- 确定的 `data-pnw-color-scheme="light|dark"`；
- 与 `PnwWorkbenchLayout` 共用的 `pnw-workbench-theme-root` 默认 token。

`PnwAppModalOverlay`、`PnwChoiceDialogHost`、`PnwFloatingPanel`、工作台设置面板、Activity Tree
子菜单和 `PnwAsyncProgressOverlay` 均使用该 Provider。它们新增的 `colorScheme?` 仅用于独立嵌入或
测试；正常应用不应让每个插件重复传值。

浮层首先读取 Host 可覆盖的 canonical token，例如 `--pnw-workbench-surface`、
`--pnw-workbench-text`、`--pnw-workbench-muted`、`--pnw-workbench-border`、`--pnw-control-*`、
`--pnw-primary-*`、`--pnw-danger-*`；随后才回退到统一的
`--pnw-workbench-default-*`。核心 Modal 不再把 legacy `--page-bg / --text / --border-strong` 放在
第一选择。

## 3. Host adapter

Host 的主题桥在唯一主题真源变化时执行：

```ts
import { pnwApplyColorScheme, type PnwColorScheme } from 'phoenix-wing'

function applyHostTheme(scheme: PnwColorScheme): void {
  const resolved = pnwApplyColorScheme(scheme)

  // Host 责任：供 Element Plus Teleport 使用。
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}
```

若 Host 提供自定义品牌主题，应在 `html/body` 或全局 overlay 容器上定义 canonical
`--pnw-workbench-*`，使 Teleport 根继承；只定义在 `.pnw-workbench-layout` 内部的变量不会跨越
Teleport。Wing 不主动切换 Element Plus class，也不接管 Host 的主题持久化。

应用根层仍只挂载一个 `PnwChoiceDialogHost`。缺失 Host 的快速失败/可探测能力是独立的 0.6.2
契约改进，不用业务插件特例代替。

## 4. 验证矩阵

Wing 门禁覆盖：

- light/dark Provider 与 `PnwAppModalOverlay` 的 Teleport SSR 输出；
- `PnwChoiceDialogHost` 的 surface、正文、muted、border、default/primary/danger 按钮 token；
- 根入口和兼容子路径解析为同一个 Provider 与 scheme 状态；
- Floating Panel、Activity Tree flyout、异步任务浮层均复用 Provider；
- 工作台与 overlay 的 light/dark 默认 token 来自同一 CSS 源。

Admin 消费验收继续覆盖 Function 启停确认框、新建/编辑 `el-dialog`、Issue/列表/8D/推送弹窗，
并分别检查 light/dark、hover/focus/disabled、console 与焦点恢复。
