// phoenix-wing — Phoenix Wing 共享 TypeScript 工具库
// 纯逻辑 + Vue3 控件 + 算法

export const PNW_VERSION = '0.1.0'

// ---------------------------------------------------------------------------
// 异步任务进度
// ---------------------------------------------------------------------------
export {
  type PnwAsyncProgressStep,
  type PnwAsyncTaskState,
  type PnwTaskKind,
  type PnwTaskStatus,
  type PnwStepStatus,
  type PnwStepError,
  type PnwFileTimingRecord,
  PNW_SCAN_STEP_LABELS,
  PNW_TEST_STEP_LABEL,
} from './utils/asyncProgressTypes.js'

export {
  pnwCreateScanTaskState,
  pnwCreateTestTaskState,
  pnwComputeStepStatus,
  pnwComputeProgressPercent,
  pnwIsTerminal,
  pnwFilterActiveTasks,
  pnwSortTasksByTime,
  pnwHasRunningTasks,
  pnwAppendTaskLog,
  pnwUpdateTaskFromPoll,
  pnwUpdateTaskFromStreamEvent,
  pnwRecordFileTiming,
  pnwAverageFileDuration,
  pnwFastestFileDuration,
  pnwSlowestFileDuration,
  pnwEstimateRemaining,
  pnwFormatDuration,
  pnwFormatSeconds,
} from './utils/asyncProgress.js'

// ---------------------------------------------------------------------------
// 防抖调度
// ---------------------------------------------------------------------------
export { pnwScheduleDebounced } from './utils/scheduleDebounced.js'

// ---------------------------------------------------------------------------
// 色彩方案
// ---------------------------------------------------------------------------
export { type PnwColorScheme, pnwResolveColorScheme, pnwApplyColorScheme } from './utils/colorScheme.js'

// ---------------------------------------------------------------------------
// 指针拖拽
// ---------------------------------------------------------------------------
export { pnwBindPointerDrag } from './utils/pointerDrag.js'

// ---------------------------------------------------------------------------
// 浏览器存储
// ---------------------------------------------------------------------------
export { pnwClearPhoenixBrowserStorage } from './utils/phoenixBrowserStorage.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export { type PnwComboOption } from './types/comboTypes.js'

export {
  type PnwPagePropertyScalar,
  type PnwPagePropertySelectOption,
  type PnwPagePropertySelectOptionsSource,
  type PnwPagePropertyFieldBase,
  type PnwPagePropertyBooleanField,
  type PnwPagePropertyStringField,
  type PnwPagePropertyNumberField,
  type PnwPagePropertySelectField,
  type PnwPagePropertyInfoField,
  type PnwPagePropertyPathField,
  type PnwPagePropertyField,
  type PnwPagePropertyGroup,
  type PnwPagePropertiesSheet,
} from './types/pageProperties.js'

// ---------------------------------------------------------------------------
// 属性表 Schema 构建器
// ---------------------------------------------------------------------------
export {
  pnwPropGroup,
  pnwPropBool,
  pnwPropEnum,
  pnwPropRadio,
  pnwPropString,
  pnwPropNumber,
  pnwPropPath,
  pnwPropReadonly,
  pnwPropSheet,
} from './utils/pagePropertySchema.js'

// ---------------------------------------------------------------------------
// Pinia stores
// ---------------------------------------------------------------------------
export { usePnwAsyncTaskStore } from './stores/asyncTasks.js'

// ---------------------------------------------------------------------------
// Vue3 Composables
// ---------------------------------------------------------------------------
export {
  type PnwChoiceDialogOption,
  type PnwChoiceDialogCheckboxItem,
  type PnwChoiceDialogCheckboxes,
  type PnwChoiceDialogRequest,
  type PnwChoiceDialogResult,
  pnwChoiceDialogOpen,
  pnwChoiceDialogRequest,
  pnwPromptChoice,
  pnwResolveChoice,
} from './composables/choiceDialog.js'

// Vue3 组件请从子路径导入:
//   import PnwAppModalOverlay from 'phoenix-wing/components/PnwAppModalOverlay.vue'
//   import PnwChoiceDialogHost from 'phoenix-wing/components/PnwChoiceDialogHost.vue'
//   import PnwComboTextInput from 'phoenix-wing/components/PnwComboTextInput.vue'
//   import PnwExpandCaret from 'phoenix-wing/components/PnwExpandCaret.vue'
//   import PnwAsyncProgressOverlay from 'phoenix-wing/components/PnwAsyncProgressOverlay.vue'
