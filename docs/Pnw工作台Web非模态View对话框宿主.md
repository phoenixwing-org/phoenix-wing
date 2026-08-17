# Pnw 工作台 Web · 非模态 View 对话框宿主

状态：current

Owner：Phoenix Wing maintainers

适用版本：0.7.0 candidate

最后核验：2026-08-15

## 1. 结论

这个需求合理，适合工程软件中的参数编辑器、检查器、预览、比较和辅助工具：用户需要把
一块内容移出主工作区边界，同时继续操作主 View、Primary 和 Editor。它不是确认框，也
不是第二个独立工作空间。

Wing 统一使用 **非模态 View 对话框** 这个概念：

- Tauri 桌面 Host：优先打开带父窗口关系的非模态 Webview 窗口；允许移到主窗口边界
  之外，但不禁用父窗口；
- 普通 Web Host：降级为应用内部无蒙层浮窗，复用 `PnwFloatingPanel`；
- 两种呈现使用同一个 `requestId / viewId / props / result` 契约；
- Wing 提供纯 TypeScript 仲裁与状态边界，Host 提供 Tauri/Web adapter；Wing 不依赖
  `@tauri-apps/api`，也不接管 Router、Pinia、业务状态或窗口权限。

工程资源库类原型证明了应用内非模态浮窗的交互价值：用户可边查看主 View，边操作辅助
资料库；本能力学习的是这种“主界面持续可用”的效果，不吸收产品文件格式、领域算法或
业务 Store。

> 边界纠正：本契约只适用于独立检查器/编辑草稿，不负责把 owner Tab 的完整业务 View
> 从 Editor 浮出。完整 View 必须保留稳定 Tab、迁移整个 frame，并使用独立的
> presentation lease；见[《完整 View 浮出与收回方案》](Pnw工作台Web完整View浮出与收回方案.md)。

## 2. 为什么不是模态框或独立窗口工作区

### 2.1 非模态是本需求的核心

模态框会让背景内容 inert，适合必须先决策的确认、授权和破坏性操作；本需求恰好需要在
对话框存活时继续使用 Primary 和主 View，因此不得：

- 给 Web fallback 添加遮罩或 `aria-modal`；
- 调用桌面 API 禁用父窗口；
- 把 `PnwAppModalOverlay` 当成 fallback；
- 把对话框提升成拥有自己导航、标签和持久化会话的第二工作空间。

### 2.2 同类实现的共同做法

- Tauri 2 的窗口 `parent` 选项在 Windows 建立 owned window，在 Linux 建立 transient
  关系，在 macOS 建立 child window；这个关系管理层级和父窗口退出，但不要求把子窗口
  限制在父窗口矩形内。
- Electron 的 `BrowserWindow` 也把 `parent` 与 `modal` 分开；本方案等价于只设置
  parent、不设置 modal。
- Web 平台的 `<dialog>.show()` 也是允许用户继续操作外部内容的非模态模式；Wing 选择
  已有 `PnwFloatingPanel`，是因为它已经提供拖动、可视区修正、层级和 Teleport 主题。

参考：

- [Tauri 2 Window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/)
- [Tauri 2 WebviewWindow API](https://v2.tauri.app/reference/javascript/api/namespacewebviewwindow/)
- [Electron BrowserWindow：parent / modal](https://www.electronjs.org/docs/latest/api/browser-window)
- [MDN：HTMLDialogElement.show()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/show)

## 3. 公共契约

```ts
type PnwViewDialogPresentation = "desktop-dialog" | "web-floating";

interface PnwViewDialogRequest<TProps> {
  requestId: string;
  viewId: string;
  title: string;
  props: TProps;
  parentId?: string;
  size?: Partial<PnwViewDialogSize>;
  instancePolicy?: "single" | "parallel";
  maxInstances?: number;
  colorScheme?: "light" | "dark" | "system";
}

type PnwViewDialogOutcome<TResult> =
  | { status: "submitted"; value: TResult }
  | { status: "closed"; reason: PnwViewDialogCloseReason }
  | { status: "failed"; code: PnwViewDialogFailureCode; message: string };
```

`pnwCreateViewDialogController()` 接收必需的 `webFloating` adapter 和可选的
`desktopDialog` adapter。桌面 adapter 只有同时声明以下能力时才会被选择：

1. 能建立父窗口关系；
2. 父窗口在对话框打开时仍可交互；
3. 对话框可越过父窗口边界；
4. 请求提供非空 `parentId`。

否则自动降级到 `web-floating`。这个能力探测是 Host 的真实声明，不能通过是否存在
`window` 对象猜测。

默认尺寸为 `720 × 520`，最小尺寸为 `360 × 240`。默认同一 `viewId` 只允许一个
实例；明确使用 `parallel` 时，仍同时受请求 `maxInstances` 和 adapter
`maxOpenDialogs` 限制。

## 4. Host adapter 责任

### 4.1 Tauri 桌面 adapter

Host 负责：

1. 将 `viewId` 映射到本地白名单 renderer；插件不得把任意 URL、Vue Component 或
   Router 对象交给 Wing；
2. 创建带 `parent` 的 `WebviewWindow`，不调用 `setEnabled(false)`，不增加 modal
   遮罩；
3. 使用逻辑像素处理初始尺寸，并让操作系统管理多显示器位置；
4. 通过受控 IPC/事件传递可序列化 props 和 result，不把敏感 props 放进 URL；
5. 传播已解析的 light/dark 主题与 locale；
6. 在提交、用户关闭、父窗口关闭、应用退出和创建/运行异常路径上恰好 settle 一次；
7. 只给该对话框 renderer 所需的最小 Tauri capability，不把主窗口权限整体复制过去。

Tauri adapter 是应用壳层代码，不进入 Wing，也不意味着每个 Webview 共享 Pinia 内存。

### 4.2 Web floating adapter

Web Host 使用同一个 `viewId` registry，把 renderer 放入 `PnwFloatingPanel`：

- 无背景遮罩、无 `aria-modal`，Primary 和 Editor 继续可交互；
- 使用 Wing overlay theme root，跟随 light/dark/system；
- 浮窗位置只属于当前 Host 会话；是否持久化由 Host 决定；
- 关闭、提交和异常返回与桌面 adapter 相同的 outcome。

Web fallback 不能越过浏览器 viewport，这是可探测的能力差异，不伪装成桌面窗口。

## 5. View 与业务状态

本能力不会把正在运行的 Vue DOM 从 Editor 搬进另一个 Webview。推荐流程是：

1. 原 View 保持挂载并继续拥有唯一业务状态；
2. 打开请求传递一份可序列化 props/snapshot；
3. 对话框编辑自己的草稿，提交结构化 result；
4. Host 校验 revision/etag，再把 result 应用到原 View；
5. 原状态在对话框期间已改变时，Host 明确拒绝、合并或请求用户确认，Wing 不猜冲突语义。

因此“显示同一个业务 View”表示复用相同 renderer/契约，不表示共享 DOM、Pinia 实例、
未序列化引用或进程内对象。Primary 仍属于主工作台；对话框需要的辅助字段通过 props
显式传入。

## 6. 最小使用示例

```ts
const pnwViewDialogs = pnwCreateViewDialogController({
  webFloating: pwwWebFloatingAdapter,
  desktopDialog: pwwTauriViewDialogAdapter,
});

const result = await pnwViewDialogs.open<PartEditorProps, PartEditorResult>({
  requestId: crypto.randomUUID(),
  viewId: "part-editor",
  title: "编辑零件",
  parentId: "main",
  props: { partId, revision },
  size: { width: 760, height: 560 },
});

if (result.status === "submitted") {
  await applyPartEditorResult(result.value);
}
```

示例中的 `pww*` adapter 和业务类型属于消费者；Wing 公开名称继续只使用 `Pnw / pnw / PNW_`。

## 7. 分阶段计划

### VDH0：公共契约与仲裁（本轮）

- [x] `PnwViewDialog*` 请求、能力、结果、关闭原因和 adapter 类型；
- [x] 请求尺寸/实例策略归一化与运行时基础校验；
- [x] desktop-dialog / web-floating 能力选择与自动降级；
- [x] 同 View 单实例、少量并行、Host 上限、主动关闭和异常 settle；
- [x] 根入口、类型/工具子路径、tarball 与隔离 consumer 门禁；
- [x] 纯逻辑单元测试与本方案文档。

### VDH1：Host 参考 adapter 与真实消费

- [ ] Desk Tools 或第二个本地 Host 在独立消费分支实现 Tauri adapter；
- [x] Web fixture 使用 `PnwFloatingPanel` 实现无蒙层 adapter；
- [ ] 确认同一 renderer 的 props/result、主题和 locale；
- [ ] 取得 macOS 与 Windows 的父子关系、跨主窗口边界、父窗口最小化/关闭证据。

### VDH2：第二消费者后再决定的提炼

- [ ] 若两个 Host 重复同一套 Web adapter，再增加 `PnwViewDialogFloatingHost`；
- [ ] 若两个 Tauri Host 重复同一套桥接，再增加独立 adapter 包；
- [ ] 在真实需求出现前不增加任意窗口迁移、跨窗口工作空间恢复和共享 Store 协议。

## 8. 验收矩阵

| 场景 | 自动测试 | 消费者人工/集成测试 |
| --- | --- | --- |
| Web 自动 fallback | presentation、单实例、并行、关闭、异常 | 无蒙层，Primary/Editor 可操作，Esc/X 可关闭 |
| Tauri 能力完整 | 选择 desktop-dialog | 可移出主窗口，父窗口仍可操作 |
| 父关系/越界能力不足 | 强制 web-floating | 不出现失效按钮或伪桌面承诺 |
| 父窗口关闭/应用退出 | close reason 类型 | Promise 必须 settle，不留幽灵窗口 |
| light/dark/system | colorScheme 透传 | 窗口创建首帧不闪白，正文/控件可读 |
| 单实例/少量并行 | View/adapter 上限 | 重复打开有明确反馈，不静默挂起 |
| Windows/macOS | 平台无关契约 | owned/child 行为、最小化、关闭与多显示器 |

## 9. 明确不做

- 不创建独立进程；
- 不提供第二套 Workbench、Router、标签栏或 Primary；
- 不在多个 Webview 间共享 Pinia 内存；
- 不做任意 embedded/floating/native-window 迁移；
- 不做窗口工作空间持久化与崩溃恢复协议；
- 不把确认、授权和破坏性操作改成非模态；
- 不把消费者名称、私有文件格式或其他产品字段写入公共 API。
