# Pnw 工作台 Web · 动态布局与拖动可行性

状态：current（位置已实现，拖动仍为 draft）

Owner：Phoenix Wing maintainers

适用版本：Wing 0.6.0 本地候选（未发布）

最后核验：2026-07-29

## 1. 结论

工作台进入“布局编辑模式”在技术上可行，但应分成三个风险不同的阶段：

1. **View 标签栏受控位置：已实现。** `PnwWorkbenchTabBarPlacement` 支持 Header、导航后/Editor 顶部与 Editor 底部；三种位置只渲染一个 TabBar，不复制状态或业务动作。“导航前”因切断 Ribbon 与 Editor 的视觉连续性已删除，未知值回到 Header。
2. **ActivityBar 与 View 标签拖动：高可行、尚未实现。** 下一阶段只增加投放区和可取消编辑遮罩，提交前不改变真实布局。
3. **任意业务 Block 在 Primary / Secondary / Bottom 间移动：中等可行、生命周期风险较高。** 现有 `PnwViewBlockComponentContributions` 以位置作为字段名；直接把组件从一个 slot 改到另一个 slot 会卸载并重建 Vue 组件，可能丢失表单、滚动、订阅和 KeepAlive 状态。必须先建立稳定 Block 身份和不重建的移动原型，再讨论公共契约。

因此当前只导出已经能由同一 Shell 安全实现的标签位置类型；布局编辑 overlay 与 Block placement 仍只记录候选状态。两个真实 Web 消费者完成原型验证后，再决定是否冻结后两者。

## 2. View 标签栏受控位置

View 标签默认位于 Header 内，在品牌、大分组和用户区之间占用剩余空间。0.6.0 候选已提供以下位置：

| 候选位置 | 视觉关系 | 评价 | 建议 |
|---|---|---|---|
| Header 内 | 当前实现 | 最紧凑，品牌、模块、标签、用户区在一行；标签多时与大分组争夺宽度 | 保持默认 |
| Ribbon 下方 | Ribbon 下、Editor 上 | 标签最接近它控制的 View，符合 IDE 常见结构；可只对齐 Editor 列，避免横跨 Primary/Secondary | 推荐为最主要的第二候选 |
| Bottom 下方、Footer 上方 | 与 Bottom 一样只占 Editor 列 | 适合终端、日志、预览占主导的工作流；但标签远离 Header/导航，普通业务页面不直观 | 支持为专业场景，不作为默认 |

候选位置只是呈现偏好。移动前后必须继续使用同一份 `PnwWorkbenchTabItem[]`、active ID、dirty 状态、关闭事件、Router/Process/KeepAlive 会话，不复制标签数据。

### View Block 显隐开关位置 TODO

当前 Primary / Bottom / Secondary 三个仅图标开关位于 Footer 右侧。后续位置调整同时比较：

- `footer`：保持当前默认；Header 已同时承载品牌、一级分组、View 标签和 consumer 用户区，Footer 可避免再次拥挤；
- `header`：参考 VS Code 的可选位置；只适合 View 标签已移到 Editor 上方/下方，或宿主确认顶部有余量的桌面布局；

该偏好只移动同一组开关，不复制按钮、贡献状态或事件。无论显示在 Header 还是 Footer，都必须继续只枚举当前 View 实际贡献的 Block；consumer 的用户区与 Header action slot 仍可共存。配置中心应把 View 标签位置与开关位置并列显示，帮助用户理解顶部空间组合。第一阶段先提供纯位置解析和 fixture 对照，窄屏时统一回退 Footer，但不得静默覆盖宿主保存值。

### Tree 模式的已定映射

“Ribbon 前/后”是相对顶部 ActivityBar 的位置，但 Tree 模式的 ActivityBar 在左侧。0.6.0 候选采用以下固定规则：

- `after-navigation` 始终位于 Editor 顶部，因此 Ribbon 下与 Tree 右侧都只占 Editor 列；
- `editor-bottom` 始终位于 Bottom 后、Footer 前，并与 Editor 对齐。

该映射让三个偏好在两种导航呈现中保持可区分，也不会静默改写用户保存值。配置中心明确提示 Tree 下“导航后”位于 Editor 顶部。

## 3. 布局编辑模式

布局编辑不应与普通 resize 句柄混用。建议从“完整显示设置”进入独立模式：

```text
┌ 工作台布局编辑 ─────────────────────────── [取消] [完成]
│ 低透明遮罩保留真实页面可见，不模糊内容
│
│ [Header 投放区]
│ [Header 与 Activity 之间]
│ [ActivityBar：可拖动到顶部 / 左侧]
│ [Activity 下方 / Editor 顶部]
│ ┌ Primary ┐ ┌ Editor ─────────┐ ┌ Secondary ┐
│ │         │ │                 │ │           │
│ └─────────┘ ├ Bottom ─────────┤ └───────────┘
│             ├ Editor 底部标签区
│             └─────────────────┘
│ [Footer]
└────────────────────────────────────────────────
```

编辑层应是轻量全屏 overlay，而不是把背景盖黑的模态框：

- 真实界面保持清晰，可直接理解移动后的效果；
- 可拖项目显示句柄、名称和当前位置；
- 只显示当前项目允许进入的投放区，禁止区明确但不接收 drop；
- 拖动时使用 ghost，不立即破坏原 DOM；
- `Escape` / “取消”丢弃 draft，“完成”一次性发出完整新状态；
- 键盘提供“选择项目 → 选择目标区 → 确认”的等价操作；
- resize 模式与布局编辑模式互斥，避免句柄冲突。

不建议使用浏览器原生 HTML Drag and Drop。Pointer Events 加显式 hit-test 更适合触屏、遮罩投放区和现有 `pnwBindPointerDrag`，也更容易提供键盘替代。

## 4. 状态模型方向

第一阶段只需保存两个纯数据偏好：

- ActivityBar 的呈现/位置，继续映射现有 `ribbon | tree`；
- View 标签栏位置。

后续 Block 移动需要把“内容身份”和“当前区域”分离。文档中的实验形状如下，仅用于原型，不是公共 API：

```ts
interface ExperimentalDockItem {
  id: string
  label: string
  kind: 'activity' | 'view-tabs' | 'block'
  allowedZones: readonly string[]
  defaultZone: string
}

interface ExperimentalDockPlacement {
  itemId: string
  zoneId: string
  order: number
}
```

框架内置项目可使用稳定身份，例如 `pnw.activity`、`pnw.view-tabs`、`pnw.problems`、`pnw.output`；产品 Block 使用自己的前缀，例如 `pah.properties`、`poi.issue-filter`。Wing 不解释产品 ID，也不把组件实例或 Router 信息序列化。

持久化仍由 consumer Pinia、浏览器存储或后端数据库负责。Wing 只校验 allowed zone、修正无效位置并发出完整新状态。

## 5. Vue 生命周期风险

当前 `PnwWorkbenchShell` 在 Primary、Bottom、Secondary 三个不同 slot 中分别创建动态组件。若同一日志组件从 Bottom 改成 Primary，朴素实现会触发：

1. 原组件 `onUnmounted`；
2. 新区域创建另一个组件实例；
3. 内部输入、滚动位置、局部缓存和订阅可能丢失；
4. View contribution registry 可能误判为 View 已释放。

候选解决方式：

- **稳定宿主 + Teleport：** 组件只创建一次，DOM 投送到不同区域锚点；需要验证动态更换 `to` 时 mounted/unmounted 次数、焦点和 aria 关系。
- **壳层单一 Grid：** 把所有可移动项作为同一层直系子项，通过 grid area 改位置；状态最稳定，但会较大幅重构 Header、Editor stack 与 Bottom 结构。
- **外部状态完全受控后允许重建：** 实现简单，但会把消费者所有临时 UI 状态都推到 Pinia，成本过高，不作为默认方案。

进入公共实现前必须用带输入框、滚动、订阅和 KeepAlive 的测试组件验证移动前后实例 identity 不变。该测试不通过时，Block 拖动只能停留在设计阶段。

## 6. 与 Problems / Log Block 的关系

Problems 与 Log 是最适合验证动态停靠的框架 Block：它们有稳定身份、内容由诊断总线提供，不依赖某个页面 DOM。第一阶段仍固定在 Bottom；布局编辑原型稳定后，可允许 `pnw.problems` / `pnw.output` 在 Bottom 与 Primary 间移动。

问题与日志的数据接口、跨消费者证据和总线设计见[《Pnw 工作台 Web · 问题与日志 Block 方案》](Pnw工作台Web问题与日志Block方案.md)。数据总线必须独立于位置，这样移动 Block 只改变呈现，不改变日志/问题真源。

## 7. 分阶段路线

1. **W5-D0（已完成）：** fixture 接入三种受控标签位置，并在完整显示配置中心直接切换。
2. **W5-D1（已完成）：** 导出 `PnwWorkbenchTabBarPlacement` 与默认值；Shell/Layout 移动同一个 `PnwWorkbenchTabBar`，SSR 测试验证单实例与 Tree 映射。
3. **W5-D2：** 增加只允许 ActivityBar 与 View 标签移动的布局编辑 overlay；支持取消、完成、Pointer 和键盘。
4. **W5-D3：** 用 Problems/Log 做稳定 Block 身份原型，验证 Teleport/Grid 生命周期。
5. **W5-D4：** 在 Open Issue 与 Phoenix Admin 各验证一次，再决定是否允许产品 Block 自定义 allowed zones。

## 8. 退出门禁

- 三个标签位置只有一个真实 TabBar 实例和一份 Tab 数据；
- Ribbon/Tree 切换不改变 tab ID、active、dirty、Router 或关闭语义；
- Editor 顶部/底部标签只占 Editor 列，不横跨 Activity、Primary 或 Secondary；
- 拖动取消不修改宿主状态，完成只发出一次完整新状态；
- 越界、无效 zone、隐藏 zone 和窄屏回退有纯函数测试；
- Pointer、键盘、Escape、焦点恢复和屏幕阅读器说明可用；
- Block 移动时 Vue 组件不重新 mounted，订阅和局部状态不丢失；
- light/dark/system、700px 和缩放场景浏览器回归通过；
- 至少 Open Issue 与 Phoenix Admin 两个真实消费者证明共同语义后，才冻结公共 API。
