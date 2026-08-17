# Pnw 工作台 Web · 可扩展的工作台显示配置中心

状态：current

Owner：Phoenix Wing maintainers

适用版本：Wing 0.6.1

最后核验：2026-08-01

## 1. 定位

“工作台显示设置”是 `PnwWorkbenchShell` 的第一级配置能力，不属于某个 Ribbon、Tree、View 或业务插件。它统一编辑壳层受控状态，同时允许 consumer 在公共设置之后追加自己的显示选项。

配置中心遵守四条边界：

1. Shell 只保留一个设置实例。Ribbon / Tree 切换只改变呈现，不卸载配置中心，也不关闭已经打开的设置面板。
2. Wing 提供公共显示字段、校验、布局与事件；consumer 持有 Pinia、localStorage、用户数据库及默认值迁移。
3. consumer 扩展只追加自己的 Vue 界面，不复制公共对话框，也不能把 Router、权限、业务 API 或领域状态塞入 Wing 类型。
4. 快捷菜单与完整配置中心操作同一份受控状态；“恢复默认”由 consumer 决定，不是公共菜单项。

## 2. 分层

```text
PnwWorkbenchShell                         第一级所有者
├─ PnwWorkbenchDisplaySettings           单一入口与快捷预设
│  ├─ 快捷菜单                           Tree / Compact / Ribbon
│  └─ PnwWorkbenchDisplaySettingsPanel   完整、可移动、非模态
│     ├─ Wing 公共设置段
│     └─ display-settings-panel-extra    consumer 底部扩展
├─ PnwActivityBar                        只呈现导航
├─ PnwWorkbenchLayout                    只按受控位置装配区域
└─ consumer Pinia / backend              偏好真源与持久化
```

`PnwActivityBar` 独立使用时仍保留兼容设置入口，但不显示只有 Shell 才能执行的 View 标签位置设置。被 `PnwWorkbenchShell` 组合时，ActivityBar 内部入口关闭，由 Shell 外层持有唯一实例。

## 3. 公共设置与受控状态

完整配置中心当前包含：

- 导航呈现：`ribbon | tree`；
- Tree 展开外观：`outline | admin-menu`；
- Tree 收起外观：`leaf-rail | root-flyout`；
- View 标签位置：`header | after-navigation | editor-bottom`；
- 颜色主题：`light | dark | system`；
- Ribbon 大类、合法图标尺寸、Title 与大 Ribbon 分组标签。

View 标签移动继续使用同一份 `PnwWorkbenchTabItem[]`、active ID、dirty 状态和事件，只改变一个 TabBar 实例的位置：

| 值 | Ribbon 呈现 | Tree 呈现 |
|---|---|---|
| `header` | Header 内 | Header 内 |
| `after-navigation` | Ribbon 下方、Editor 顶部 | 侧目录右侧、Editor 顶部 |
| `editor-bottom` | Bottom 下方、Footer 上方，按 Editor 对齐 | 同左 |

默认值保持 `header`。曾验证的“Header 与导航之间”全宽横带会把 Ribbon 视觉切成两段，也让标签远离它控制的 Editor，因而不进入 0.6.0 公共枚举；未知值统一归一化为 `header`。Header 同时容纳品牌、一级导航分组、View 标签与 consumer 用户区；当 Workbench 自身容器不超过 `840px` 时，壳层把实际导航统一为 Ribbon，并临时把 Header 标签放到 `after-navigation`，无需 consumer 监听窗口或修改 Pinia。恢复宽屏后自动使用原偏好。Primary / Bottom / Secondary 显隐开关仍默认放在 Footer。Header 开关位置只作为后续候选，不能与 Footer 复制两套按钮。

## 4. Consumer 扩展

快捷菜单只适合追加少量单行动作：

```vue
<template #display-settings-actions="{ emitAction }">
  <button type="button" @click="emitAction('product.log-display-state')">
    将当前显示状态写入日志
  </button>
</template>
```

Wing 原样发出 `display-settings-action(actionId)`；consumer controller 解释 ID、写自己的日志或打开业务 View。Wing 不维护 action registry。

完整配置中心底部使用 `display-settings-panel-extra`：

```vue
<template #display-settings-panel-extra>
  <PnwWorkbenchDisplaySettingsSection
    title="产品显示扩展"
    summary="consumer Pinia"
  >
    <label>
      <input v-model="productPreferences.denseTable" type="checkbox">
      紧凑表格
    </label>
  </PnwWorkbenchDisplaySettingsSection>
</template>
```

`PnwWorkbenchDisplaySettingsSection` 统一折叠段的标题、摘要、边框、亮暗主题和间距。扩展组件及其 CSS/状态使用 consumer 自己的前缀；示例目录使用 `Pww*` / `pww-`，不会伪装为 Wing 公共能力。

适合追加的内容：

- consumer 已有的密度、预览或产品主题偏好；
- fixture 的窄屏和 SVG 回归开关；
- 已由 consumer 自己持有的布局辅助选项。

不适合追加的内容：

- 导航分组 CRUD、权限或路由管理，它们应是独立 View；
- 用户、退出、租户、审计等业务功能；
- 大段插件设置中心。它们应由 consumer Router / View 承载；
- 另一套与公共设置重复的导航、主题或 Ribbon 表单。

## 5. 为什么暂不提供动态 section registry

一个 Vue slot 已能覆盖简单 Web、Open Issue 与单一宿主扩展，并保持类型和生命周期清晰。现在公开动态 registry 会立即引入 section ID、排序、权限、异步加载、卸载、冲突和持久化迁移等产品语义。

只有 Phoenix Admin 的多个真实插件和另一个 Web consumer 都证明需要运行时注册时，才评估实例级 registry。届时仍须满足：

- registry 由每个 Shell 实例创建，禁止跨应用全局单例；
- section 有稳定、带产品前缀的 ID；
- Wing 只做排序和渲染，不解释权限与业务 payload；
- 注册/注销不能关闭配置中心或重建其他 section；
- 静态 slot 继续保留兼容。

## 6. 状态、持久化与版本迁移

配置中心的所有更新均发出完整受控值。Wing 导出 `PnwWorkbenchDisplayPreferences`、`PNW_DEFAULT_WORKBENCH_DISPLAY_PREFERENCES` 与单一入口 `pnwNormalizeWorkbenchDisplayPreferences`，统一修正缺字段、非法枚举、非有限坐标和越界面板尺寸。consumer 可以把结果放入自己的 Pinia 偏好：

```ts
interface ProductWorkbenchDisplayPreferences {
  presentation: PnwActivityBarPresentation
  treeCollapsed: boolean
  treeAppearance: PnwActivityTreeAppearance
  ribbonAppearance: PnwRibbonAppearance
  tabBarPlacement: PnwWorkbenchTabBarPlacement
  colorScheme: PnwColorScheme
  layoutState: PnwWorkbenchLayoutState
  settingsPositions: PnwWorkbenchDisplaySettingsPositions
}
```

这是一份只描述公共显示字段的轻量快照，不包含 Router、权限、业务 View、导航分组或用户身份。设置面板位置也是受控状态：快捷面板默认 `{ x: 16, y: 72 }`，完整面板默认 `{ x: 8, y: 8 }`；打开和拖动时 `PnwFloatingPanel` 仍把它修正到可见边界。设置入口会测量同一 Workbench Header 的 viewport 底边，通过 `constrainInsets.top` 把快捷/完整面板夹到 Header 下方；因此旧 Pinia 坐标即使位于顶部，也不会遮住标题、完成或关闭。长内容受安全区域高度限制，只滚动面板正文。

不同产品仍可采用前端缓存、登录用户数据库或完全不持久化；Wing 不选择介质，也不自动读取浏览器存储。consumer 保存自己的 envelope 版本，读入后先调用 checker，再绑定给 Shell。仓内 fixture 作为真实 consumer，使用 Pinia + `localStorage` 演示刷新恢复；未来 Admin 可以把同一快照接到后端用户偏好。

Editor 最大化是独立的瞬时壳层状态，刻意不加入上述快照。`editorMaximized` 只由
Shell/Layout 受控输入与更新事件承载；还原后继续使用最大化前同一份
`PnwWorkbenchDisplayPreferences`。

### 6.1 国际化与叠层

Shell 的 `locale` 由 Host 传入，Wing 不持久化语言。完整设置和快捷菜单的 Wing
文案随 `zh-CN / en-US` 切换；consumer slot 内文案仍由产品自己的国际化系统处理。

设置面板使用 `PNW_WORKBENCH_OVERLAY_LAYERS.floatingPanel`。Header 用户区、语言
dropdown 等 Host 工具使用更高的 `hostTools`，模态框使用 `modal`。若第三方组件
Teleport 到 body，Host 应把该常量传给第三方 z-index 配置，而不是覆盖 Wing 内部
选择器。

## 7. 后续扩展顺序

1. **已落地：** Shell 级单一设置实例、快捷预设、完整非模态面板、Tree 两轴外观、三个 View 标签位置、受控窗口坐标、统一 checker 和 consumer 底部 slot。
2. **下一步：** 比较 Open Issue 与 Phoenix Admin 的真实偏好迁移和 KeepAlive 行为；窄屏统一 Ribbon、标签迁移和 View/Block/Footer 单滚动流已由框架完成。
3. **随后评估：** Footer / Header 的同一组 Block 显隐开关位置。
4. **单独原型：** 可取消的布局编辑 overlay，只先移动 Activity 与 View 标签。
5. **暂不公开：** 任意业务 Block 跨 Primary / Secondary / Bottom 拖动；必须先证明 Vue 实例、焦点、表单、滚动和订阅不会因移动被重建。

动态布局风险与退出条件见[《Pnw 工作台 Web · 动态布局与拖动可行性》](Pnw工作台Web动态布局与拖动可行性.md)。

## 8. 验收门禁

- Ribbon / Tree 切换时设置入口和已打开面板不消失；
- 快捷菜单、完整面板和 consumer 扩展只存在一个公共实例；
- 三个标签位置均只渲染一个 TabBar，active、dirty、关闭和顺序不变；
- `after-navigation` 与 `editor-bottom` 不横跨 Primary / Secondary；
- Tree 四种展开/收起组合使用同一导航树；
- consumer slot 在公共设置之后，滚动与 sticky Footer 正常；
- `PnwWorkbenchDisplaySettingsSection` 在 light/dark/system 下可读；
- 700px、键盘、Escape、焦点恢复和浮层越界修正通过；
- fixture 修改主题、导航外观、标签位置、面板尺寸或设置窗口坐标后刷新仍恢复；损坏快照由 checker 回到合法默认值；
- 窄屏设置明确区分“当前有效 Ribbon”和“恢复宽屏后的导航偏好”；快捷菜单禁用 Tree 入口，完整设置锁定 Tree / Ribbon 大分类，避免无即时反馈的修改，consumer 不维护响应式状态；
- typecheck、单元测试、示例 build 与 `pnpm docs:check` 通过。

本能力属于 Wing 0.6.0 本地候选；未发布前，消费者只能按仓库规定使用并列源码 resolver 验证，不能把本地成功写成 Registry 发布结论。
