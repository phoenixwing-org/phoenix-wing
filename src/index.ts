// phoenix-wing — Phoenix Wing 共享 TypeScript 工具库
// 纯逻辑 + Vue3 控件 + 算法

export const VERSION = '0.1.0'

// ---------------------------------------------------------------------------
// 异步任务进度
// ---------------------------------------------------------------------------
export {
  type AsyncProgressStep,
  type AsyncTaskState,
  type TaskKind,
  type TaskStatus,
  type StepStatus,
  type StepError,
  type FileTimingRecord,
  SCAN_STEP_LABELS,
  TEST_STEP_LABEL,
} from './utils/asyncProgressTypes.js'

export {
  createScanTaskState,
  createTestTaskState,
  computeStepStatus,
  computeProgressPercent,
  isTerminal,
  filterActiveTasks,
  sortTasksByTime,
  hasRunningTasks,
  appendTaskLog,
  updateTaskFromPoll,
  updateTaskFromStreamEvent,
  recordFileTiming,
  averageFileDuration,
  fastestFileDuration,
  slowestFileDuration,
  estimateRemaining,
  formatDuration,
  formatSeconds,
} from './utils/asyncProgress.js'

// ---------------------------------------------------------------------------
// 防抖调度
// ---------------------------------------------------------------------------
export { scheduleDebounced } from './utils/scheduleDebounced.js'

// ---------------------------------------------------------------------------
// 色彩方案
// ---------------------------------------------------------------------------
export { type ColorScheme, resolveColorScheme, applyColorScheme } from './utils/colorScheme.js'

// ---------------------------------------------------------------------------
// 指针拖拽
// ---------------------------------------------------------------------------
export { bindPointerDrag } from './utils/pointerDrag.js'

// ---------------------------------------------------------------------------
// 浏览器存储
// ---------------------------------------------------------------------------
export { clearPhoenixBrowserStorage } from './utils/phoenixBrowserStorage.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export { type ComboOption } from './types/comboTypes.js'

export {
  type PagePropertyScalar,
  type PagePropertySelectOption,
  type PagePropertySelectOptionsSource,
  type PagePropertyFieldBase,
  type PagePropertyBooleanField,
  type PagePropertyStringField,
  type PagePropertyNumberField,
  type PagePropertySelectField,
  type PagePropertyInfoField,
  type PagePropertyPathField,
  type PagePropertyField,
  type PagePropertyGroup,
  type PagePropertiesSheet,
} from './types/pageProperties.js'

// ---------------------------------------------------------------------------
// 属性表 Schema 构建器
// ---------------------------------------------------------------------------
export {
  propGroup,
  propBool,
  propEnum,
  propRadio,
  propString,
  propNumber,
  propPath,
  propReadonly,
  propSheet,
} from './utils/pagePropertySchema.js'

// ---------------------------------------------------------------------------
// Pinia stores
// ---------------------------------------------------------------------------
export { useAsyncTaskStore } from './stores/asyncTasks.js'

// ---------------------------------------------------------------------------
// Vue3 Composables
// ---------------------------------------------------------------------------
export {
  type ChoiceDialogOption,
  type ChoiceDialogCheckboxItem,
  type ChoiceDialogCheckboxes,
  type ChoiceDialogRequest,
  type ChoiceDialogResult,
  choiceDialogOpen,
  choiceDialogRequest,
  promptChoice,
  resolveChoice,
} from './composables/choiceDialog.js'

// Vue3 组件请从子路径导入:
//   import AppModalOverlay from 'phoenix-wing/components/AppModalOverlay.vue'
//   import ChoiceDialogHost from 'phoenix-wing/components/ChoiceDialogHost.vue'
//   import ComboTextInput from 'phoenix-wing/components/ComboTextInput.vue'
//   import ExpandCaret from 'phoenix-wing/components/ExpandCaret.vue'
//   import AsyncProgressOverlay from 'phoenix-wing/components/AsyncProgressOverlay.vue'
