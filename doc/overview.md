# phoenix-wing v0.1 内容总览

## 目录结构

```
src/
├── index.ts                         ← 统一导出入口
├── utils/
│   ├── asyncProgress.ts             ← 异步任务进度纯函数
│   ├── asyncProgressTypes.ts        ← 进度类型定义
│   ├── scheduleDebounced.ts         ← 防抖调度
│   ├── colorScheme.ts               ← 色彩方案解析
│   ├── pointerDrag.ts               ← 指针拖拽
│   ├── phoenixBrowserStorage.ts     ← 浏览器存储
│   └── pagePropertySchema.ts        ← 属性表 schema 构建器
├── types/
│   ├── pageProperties.ts            ← 属性面板类型系统
│   └── comboTypes.ts                ← 下拉选项类型
├── components/
│   ├── AppModalOverlay.vue          ← 全屏模态框
│   ├── ChoiceDialogHost.vue         ← 选择对话框
│   ├── ComboTextInput.vue           ← 组合输入框
│   ├── ExpandCaret.vue              ← 展开三角图标
│   └── AsyncProgressOverlay.vue     ← 任务进度浮层
├── composables/
│   └── choiceDialog.ts              ← 选择对话框逻辑
└── stores/
    └── asyncTasks.ts                ← 异步任务 Pinia store
```

## 模块说明

### 纯工具函数（无框架依赖）

| 模块 | 说明 | 主要导出 |
|------|------|----------|
| `asyncProgress` | 异步任务进度状态机 | `createScanTaskState`, `createTestTaskState`, `updateTaskFromPoll`, `updateTaskFromStreamEvent`, `computeProgressPercent`, `formatDuration` 等 |
| `asyncProgressTypes` | 进度相关类型定义 | `AsyncTaskState`, `AsyncProgressStep`, `TaskStatus`, `StepStatus` 等 |
| `scheduleDebounced` | 防抖调度 | `scheduleDebounced` |
| `colorScheme` | 色彩方案解析 | `ColorScheme`, `resolveColorScheme`, `applyColorScheme` |
| `pointerDrag` | 指针拖拽交互 | `bindPointerDrag` |
| `phoenixBrowserStorage` | 浏览器存储清理 | `clearPhoenixBrowserStorage` |
| `pagePropertySchema` | 属性表 schema 构建器 | `propGroup`, `propBool`, `propEnum`, `propString`, `propNumber`, `propPath`, `propReadonly`, `propSheet` |

### 类型定义

| 模块 | 说明 |
|------|------|
| `pageProperties` | 属性面板完整类型系统 |
| `comboTypes` | 下拉选项 `ComboOption` 类型 |

### Vue3 控件

| 组件 | 说明 | 依赖 |
|------|------|------|
| `AppModalOverlay` | 全屏模态框，Teleport 到 body，Escape 关闭 | Vue 3 |
| `ChoiceDialogHost` | 多按钮选择对话框，支持复选框 | Vue 3 + Element Plus |
| `ComboTextInput` | 带下拉选项的文本输入框 | Vue 3 |
| `ExpandCaret` | 展开/折叠三角图标 | 无 |
| `AsyncProgressOverlay` | 任务进度浮层（全屏/浮动/最小化三态） | Vue 3 + Element Plus + Pinia |

### 组合式函数

| 模块 | 说明 |
|------|------|
| `choiceDialog` | Promise 风格的选择对话框，`promptChoice(request)` → `Promise<ChoiceDialogResult>` |

### 状态管理

| 模块 | 说明 |
|------|------|
| `asyncTasks` | 异步任务 Pinia store，支持多任务、持久化、取消 |
