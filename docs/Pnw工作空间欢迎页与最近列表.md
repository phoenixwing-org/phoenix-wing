# Pnw 工作空间欢迎页与最近列表

状态：current

Owner：Phoenix Wing maintainers

适用版本：0.7.0+

最后核验：2026-08-17

## 1. 目标

本能力把 Desk Tools 中已经验证的“打开工作目录 + 最近工作空间”交互提炼为 Host 中立的
Wing UI。第三方本地应用不再重复编写欢迎页分栏、当前目录、最近列表、入口判断、移除动作、
窄屏和明暗主题样式。

Wing 不选择目录、不扫描磁盘、不保存最近记录，也不拥有产品设置、帮助链接、Router 或
未保存业务状态。数据与动作继续由 `pnwCreateWorkspaceController` 和 Host adapter 提供。

## 2. 组件分层

| 组件 | 职责 | 不负责 |
| --- | --- | --- |
| `PnwWelcomeShell` | 固定的左右分栏骨架、主题 token、窄屏转单列 | Workspace 状态和动作 |
| `PnwRecentWorkspaceList` | 最近条目、当前/缺失/权限状态、打开/移除、条目扩展 slot | 读取目录、删除磁盘内容、持久化 |
| `PnwWorkspaceWelcome` | 把 `PnwWorkspaceState` 组合为完整欢迎页 | 产品品牌、设置实现与业务链接 |
| `PnwWorkspaceGate` | 在 Welcome / Workbench 间执行单一受控入口策略 | Router、未保存确认和 Host 资源释放 |
| `PnwWorkspaceTypeSelect` | 默认类型、Host 扩展类型与稳定顺序 | 目录探测和业务能力判断 |
| `PnwWorkbenchHome` | 普通 Home View 的标题、动作、正文和页脚壳体 | 业务卡片、命令、Router 与自动打开策略 |

`PnwWorkspaceGate` 是本地工作台推荐入口。默认 `policy="required"`：没有当前 Workspace 时
固定显示全屏 Welcome；打开成功才进入 Workbench；关闭成功自动回 Welcome。`optional` 允许
用户显式选择“无工作空间继续进入”。默认左栏在已有 Workspace 时显示“返回工作空间”和
“关闭当前工作空间”；关闭只发事件，Host 调用 controller 完成 dirty 预检和资源释放。隐藏左栏时，
这组动作自动移到右侧页眉，不会因自定义 Welcome 而丢失入口。

Welcome 是 Workbench 外层的全屏 presentation，不是 View contribution。显示时不渲染
Ribbon、View Tab、Primary、Secondary、Bottom 或 Editor 外壳，也不进入 owner Tab、Editor
MRU 或 floating stack。`PnwWorkspaceGate.colorScheme` 会把 light/dark/system 传给 Welcome
自己的 `pnw-workbench-theme-root`，不要求消费者在 Workbench 外手工复制主题类。产品“默认页/
Home”仍是独立普通 View；是否自动打开由产品策略决定。

普通主页推荐使用 `PnwWorkbenchHome` 与 `pnwCreateWorkbenchHomeDefinition`。Wing 只固定
Home 的可滚动内容壳体、标题/说明/动作/正文/页脚 slot 和 `detachable: false` 的中立注册
元数据；fixture 展示自适应卡片、界面巡游和使用提示，但本轮不新增业务卡片 DTO。消费者
可以完全替换 Home body slot，也可以只复用标题和动作区域。

## 3. 推荐接入

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { PnwWorkspaceGate, pnwCreateWorkspaceController } from "phoenix-wing";

const workspace = pnwCreateWorkspaceController({ host, recentStore });
const state = shallowRef(workspace.getSnapshot());
workspace.subscribe((next) => { state.value = next; });
</script>

<template>
  <PnwWorkspaceGate
    :state="state"
    policy="required"
    :color-scheme="colorScheme"
    app-title="Engineering Workbench"
    @open-workspace="workspace.requestOpen()"
    @open-recent="workspace.requestSwitch({ rootPath: $event.rootPath, source: 'recent' })"
    @remove-recent="workspace.removeRecent($event.workspaceId)"
    @close-workspace="workspace.requestClose()"
  >
    <template #workbench="{ showWelcome }">
      <AppWorkbench @show-welcome="showWelcome" />
    </template>
  </PnwWorkspaceGate>
</template>
```

应用品牌点击或最后一个业务 View 关闭时，把受控 `mode` 设为 `welcome`，或调用 slot 提供的
`showWelcome`；这不会关闭 Workspace。关闭必须经过 `closeWorkspace` 和 controller，成功后
Gate 依据新 snapshot 自动回 Welcome。

Wing 固定 Welcome 外壳和左右布局，产品提供品牌与业务 slot。若产品确需全宽自定义页，
使用 `:show-rail="false"` 和 `#welcome-main` 改写右侧内容；仍保留 Wing 外壳、主题和响应式，
不另造第二套页面状态判断。

品牌、左侧次级动作、兼容附加动作、帮助链接、标题操作和空列表可分别使用 `#brand`、
`#secondary-actions`、`#rail-actions`、`#links`、`#head-actions`、`#empty`。条目支持
`#entry-name`、`#entry-path`、
`#entry-badges`、`#entry-meta` 和 `#entry-actions`。

Welcome Rail 推荐固定为三组：打开 Workspace 是首入口；巡游、帮助等非生命周期命令放进
`#secondary-actions`；返回、关闭或无 Workspace 继续由 Gate 自动投影在末组。公共
`PnwWorkspaceRailAction` 接收 `label / icon / disabled / title` 并发出 `activate`，提供全宽中性
按钮、18px `currentColor` 图标、8px 图文间距、正常字距、键盘焦点和禁用态。次级组紧随打开
入口；生命周期组与前一组保持 18px 总分隔。`#rail-actions` 继续兼容既有自定义控件，但新命令
优先使用 `#secondary-actions`，避免消费者各自编写 margin 和按钮 CSS。

```vue
<template #secondary-actions>
  <PnwWorkspaceRailAction
    label="界面巡游"
    icon="search"
    @activate="startTour"
  />
</template>
```

按钮名称、行为和状态继续由 Host 拥有；Wing 不内置巡游流程，也不统一产品专有文案。

最近区域默认保持既有常开行为。需要节省纵向空间时启用
`recent-collapsible`；`recent-default-open` 提供非受控初值，`v-model:recent-open` 提供受控
开合。Wing 负责标题按钮、caret、`aria-expanded / aria-controls`、键盘、主题和窄屏；折叠只
改变呈现，不清空最近记录，也不触发目录读取。

启用折叠后，最近区域与 `PnwInformationBlock` 使用相同的 surface、border、radius、标题高度
和焦点语义，便于与后续信息 Block 连续排列。最近条目在这个模式下改为外壳内的分隔行，保留
当前项背景和条目操作边界，但不再叠加第二层卡片边框；未启用折叠时继续保持原有独立卡片列表，
兼容既有 Welcome 页面。

### 生命周期动作的位置与唯一行为

`actionPlacement="auto"` 是推荐默认：有 Rail 时把“返回/关闭”放在左侧入口区；隐藏 Rail 时
移到页眉。也可显式选择 `rail / head / none`。`none` 只关闭框架默认投影，不关闭能力；
`#secondary-actions`、`#rail-actions`、`#head-actions` 和 `#welcome-main` 都会提供同一个
`closeWorkspace()`，消费者可
在自定义位置调用它。

这些函数不是全局 singleton 事件总线。它们统一汇入 `PnwWorkspaceGate` 的
`closeWorkspace` 意图事件，再由 Host 调用 `PnwWorkspaceController.requestClose()`。因此标题
按钮、菜单和快捷键可以共享相同行为，但不会绕过 dirty 检查、保存、资源释放、失败回滚或
应用实例边界。

“关闭当前工作空间”默认使用弱于“打开工作空间”的次级文字色，不使用删除操作的红色危险态：
关闭不删除目录；是否存在未保存内容应由 controller participant 检查并在 Host 确认后执行。

### Workspace 类型

Wing 内置有序类型 `mixed / code / cad / lighting`，用于 Welcome 最近列表或设置表单：

```vue
<PnwWorkspaceTypeSelect
  v-model="workspaceTypeId"
  :types="[{ typeId: 'simulation', label: '仿真', order: 25 }]"
/>
```

`PnwWorkspaceDescriptor.workspaceTypeId` 与 `PnwRecentWorkspaceEntry.workspaceTypeId` 保存稳定
ID。`pnwNormalizeWorkspaceTypes()` 合并默认类型与 Host 扩展；Host 可覆盖默认 label/order。
类型不代表权限，不允许 Wing 根据目录内容自动猜测。

## 4. 状态和安全边界

- `available` 与 `unknown` 条目可请求打开，Host 在真正进入前仍须 canonicalize 和验证；
- `missing` 与 `unauthorized` 条目显示原因并禁用打开，仍允许从最近记录中移除；
- “移除”仅发出 `PnwRecentWorkspaceEntry`，不得解释为删除目录；
- 当前条目由稳定 `workspaceId` 判断，不以显示名或路径字符串猜测；
- 绝对 `rootPath` 仅用于显示和 Host 请求，前端组件不能据此直接访问文件系统；
- 产品模块范围、数据库配置和页面恢复继续按 workspace namespace 存储；
- 一个 controller / 一个应用窗口在 V1 中只拥有一个 `current` Workspace。

## 5. 样式与响应式

组件只使用 `--pnw-workbench-*` 与 `--pnw-control-*` 语义 token，自动跟随
light/dark/system。Host 可统一调整：

打开、返回、关闭和“无工作空间继续”默认共享 `.pnw-workspace-entry-action` 中性动作样式：
surface 背景、普通边框和正文色，hover 使用 `--pnw-control-hover-bg`，焦点使用
`--pnw-focus-ring`。Wing 默认不强调“打开工作空间”；若产品确需主次层级，通过
`#open-action` slot 或公开 CSS token 定制，不复制 Gate 状态机，也不要用活动文本色充当
按钮背景。

```css
.product-welcome {
  --pnw-welcome-rail-width: 320px;
  --pnw-welcome-rail-padding: 32px 24px;
  --pnw-welcome-main-padding: 36px 44px;
  --pnw-workspace-list-gap: 8px;
}
```

760px 以下欢迎页改为上下单列；560px 以下条目扩展动作移到第二行。长名称和路径省略但
保留 `title`，打开/移除使用原生按钮、可见焦点和本地化 ARIA 名称。

最近条目的 `#entry-actions` 与打开箭头、移除 X 共用同一垂直中心线。动作区使用稳定的
8px 横向内边距与 6px gap；`PnwWorkspaceTypeSelect size="compact"` 保持 24px 内容高度，
长类型名在 144px 默认上限内省略。560px 以下只把动作移到第二行，不拉伸 Select 成整高分栏。
Host 可统一覆盖 `--pnw-workspace-card-action-padding / -gap / -select-width /
-select-max-width`，无需 deep CSS。

`#after-recent` 是产品扩展信息块的稳定入口。两个真实消费者证明了共同的中立呈现需求后，
0.7.0 提供 `PnwInformationBlock`：它接收 `PnwInformationBlockDefinition`（`id / title /
status / items / defaultExpanded`）和 `PnwInformationBlockItem`（`id / label / value / note`），
并提供 `header / item / footer` scoped slots。组件负责折叠、主题、边距、响应式和 ARIA；Host
负责读取 JSON、决定字段语义及格式化 value。Wing 不预置任何产品字段，也不把信息 DTO 并入
Workspace controller。

信息 Block 的标题、状态、条目名称和值属于消费者 DTO。不同产品可以使用完全不同的标题和
文案；Wing 只统一可折叠外壳、主题和可访问性，不预置任何“贡献者”或其他业务词汇。

```vue
<template #after-recent>
  <PnwInformationBlock :definition="hostInformation" />
</template>
```

需要受控保存折叠状态时使用 `v-model:expanded`；默认状态来自 definition 的
`defaultExpanded`。

若一个 Block 内需要呈现多张数据卡片，使用 `PnwInformationCardGroup`，不要由 Host 手写
grid 或逐卡片 `PnwSidebarBlock`。它接收 `PnwInformationCardGroupDefinition`，自动按容器
宽度排列 3/2/1 列；卡片默认不可折叠，只有 DTO 显式声明 `collapsible: true` 时才显示 caret。
完整契约见[《Pnw 信息卡片组》](Pnw信息卡片组.md)。

## 6. 消费者迁移原则

Desk Tools 可删除欢迎页分栏、最近列表、入口判断和状态标签 CSS，只保留品牌、链接、产品
扩展字段以及调用既有 Host API 的 adapter。第三方消费者从公共 Gate 开始组合，不复制 Desk
Tools 页面，也不为了 10px、卡片或暗色模式引入产品 CSS 补丁。

Desk Tools 与第二个本地工作台消费者均已在标准并列源码模式完成验证：Welcome 保持
Workbench 外全屏 presentation，Home 独立于 Welcome，关闭动作统一进入 Gate/controller，
light/dark/system 只需传入受控 `colorScheme`。两个消费者都不再复制 Welcome 状态机、主题根
或关闭行为；最终单提交保持相同 tree 后只需精确锁定新 SHA 做最小回归。

## 7. 后续研究：新窗口打开另一个 Workspace

V1 不把多个根目录装进同一个工作台实例：纯 Web 应用保持单窗口、单 Workspace。Tauri 若要
“打开新的工作空间”，优先研究为新应用窗口创建独立 controller/session，而不是先承诺每个
Workspace 必须启动一个新端口。后续 ADR 至少应对比 VS Code 多窗口与本地插件宿主实践，并
回答：

1. `windowId / workspaceId / sessionId` 如何区分，重复打开同一 canonical root 如何处理；
2. 新窗口复用一个本地 Host 还是拥有独立 sidecar/端口，端口失败与退出由谁回收；
3. 最近 Workspace、应用偏好和 Workspace 内状态如何分层，窗口间不共享 Pinia 内存；
4. “当前窗口打开 / 新窗口打开”命令、窗口聚焦、关闭、崩溃恢复与孤儿租约；
5. 文件 watcher、SQLite、任务与插件实例是每 Workspace 独占还是由 Host 安全复用；
6. macOS/Windows 文件锁、权限、深链和 IPC 安全边界。

在这些问题获得真实 Tauri 双窗口证据前，Wing 不增加多 Workspace API，也不以“多端口”作为
既定实现。DSH 等本地 Web 应用只作为后续研究样本，不形成运行时依赖。
