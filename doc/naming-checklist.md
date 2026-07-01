# 命名前缀点检清单

规则：PascalCase → `Pnw` / camelCase → `pnw` / kebab-case → `pnw-` / UPPER_CASE → `PNW_`

---

## Vue 组件（5 个）— 全局注册，必须加

| 原名 | 新名 |
|------|------|
| `AppModalOverlay` | **`PnwAppModalOverlay`** |
| `ChoiceDialogHost` | **`PnwChoiceDialogHost`** |
| `ComboTextInput` | **`PnwComboTextInput`** |
| `ExpandCaret` | **`PnwExpandCaret`** |
| `AsyncProgressOverlay` | **`PnwAsyncProgressOverlay`** |

---

## CSS 类名（~60 个）— 必须加 `pnw-`

| 组件 | 原名示例 | 新名示例 |
|------|----------|----------|
| AppModalOverlay | `.app-modal-overlay` `.app-modal-panel` | `.pnw-modal-overlay` `.pnw-modal-panel` |
| ChoiceDialogHost | `.choice-overlay` `.choice-dialog` `.choice-btn` 等 | `.pnw-choice-*` |
| ComboTextInput | `.combo-wrap` `.combo-text-input` `.combo-menu` 等 | `.pnw-combo-*` |
| ExpandCaret | `.phoenix-expand-twistie` `.is-expanded` | `.pnw-expand-twistie` `.pnw-is-expanded` |
| AsyncProgressOverlay | `.backdrop` `.overlay` `.panel` `.card` `.toast` `.minibar` 等 | `.pnw-*` |

---

## 全局函数（30 个）— 建议统一加 `pnw`

| 原名 | 新名 |
|------|------|
| `isTerminal` | **`pnwIsTerminal`** |
| `formatDuration` | **`pnwFormatDuration`** |
| `formatSeconds` | **`pnwFormatSeconds`** |
| `scheduleDebounced` | **`pnwScheduleDebounced`** |
| `propGroup` | **`pnwPropGroup`** |
| `propBool` | **`pnwPropBool`** |
| `propEnum` | **`pnwPropEnum`** |
| `propRadio` | **`pnwPropRadio`** |
| `propString` | **`pnwPropString`** |
| `propNumber` | **`pnwPropNumber`** |
| `propPath` | **`pnwPropPath`** |
| `propReadonly` | **`pnwPropReadonly`** |
| `propSheet` | **`pnwPropSheet`** |
| `promptChoice` | **`pnwPromptChoice`** |
| `resolveChoice` | **`pnwResolveChoice`** |
| `computeStepStatus` | **`pnwComputeStepStatus`** |
| `computeProgressPercent` | **`pnwComputeProgressPercent`** |
| `sortTasksByTime` | **`pnwSortTasksByTime`** |
| `averageFileDuration` | **`pnwAverageFileDuration`** |
| `fastestFileDuration` | **`pnwFastestFileDuration`** |
| `slowestFileDuration` | **`pnwSlowestFileDuration`** |
| `estimateRemaining` | **`pnwEstimateRemaining`** |
| `resolveColorScheme` | **`pnwResolveColorScheme`** |
| `applyColorScheme` | **`pnwApplyColorScheme`** |
| `bindPointerDrag` | **`pnwBindPointerDrag`** |
| `filterActiveTasks` | **`pnwFilterActiveTasks`** |
| `hasRunningTasks` | **`pnwHasRunningTasks`** |
| `appendTaskLog` | **`pnwAppendTaskLog`** |
| `recordFileTiming` | **`pnwRecordFileTiming`** |
| `choiceDialogOpen` | **`pnwChoiceDialogOpen`** |
| `choiceDialogRequest` | **`pnwChoiceDialogRequest`** |
| `createScanTaskState` | `pnwCreateScanTaskState` |
| `createTestTaskState` | `pnwCreateTestTaskState` |
| `updateTaskFromPoll` | `pnwUpdateTaskFromPoll` |
| `updateTaskFromStreamEvent` | `pnwUpdateTaskFromStreamEvent` |
| `clearPhoenixBrowserStorage` | `pnwClearPhoenixBrowserStorage` |

---

## 全局常量（3 个）— 必须加

| 原名 | 新名 |
|------|------|
| `VERSION` | **`PNW_VERSION`** |
| `SCAN_STEP_LABELS` | **`PNW_SCAN_STEP_LABELS`** |
| `TEST_STEP_LABEL` | **`PNW_TEST_STEP_LABEL`** |

---

## 全局类型（22 个）— 建议统一加 `Pnw`

| 原名 | 新名 |
|------|------|
| `ColorScheme` | **`PnwColorScheme`** |
| `TaskKind` | **`PnwTaskKind`** |
| `TaskStatus` | **`PnwTaskStatus`** |
| `StepStatus` | **`PnwStepStatus`** |
| `StepError` | **`PnwStepError`** |
| `ComboOption` | **`PnwComboOption`** |
| `FileTimingRecord` | `PnwFileTimingRecord` |
| `ChoiceDialogOption` | `PnwChoiceDialogOption` |
| `ChoiceDialogCheckboxItem` | `PnwChoiceDialogCheckboxItem` |
| `ChoiceDialogCheckboxes` | `PnwChoiceDialogCheckboxes` |
| `ChoiceDialogRequest` | `PnwChoiceDialogRequest` |
| `ChoiceDialogResult` | `PnwChoiceDialogResult` |
| `AsyncProgressStep` | `PnwAsyncProgressStep` |
| `AsyncTaskState` | `PnwAsyncTaskState` |
| `PagePropertyScalar` | `PnwPagePropertyScalar` |
| `PagePropertySelectOption` | `PnwPagePropertySelectOption` |
| `PagePropertySelectOptionsSource` | `PnwPagePropertySelectOptionsSource` |
| `PagePropertyFieldBase` | `PnwPagePropertyFieldBase` |
| `PagePropertyBooleanField` | `PnwPagePropertyBooleanField` |
| `PagePropertyStringField` | `PnwPagePropertyStringField` |
| `PagePropertyNumberField` | `PnwPagePropertyNumberField` |
| `PagePropertySelectField` | `PnwPagePropertySelectField` |
| `PagePropertyInfoField` | `PnwPagePropertyInfoField` |
| `PagePropertyPathField` | `PnwPagePropertyPathField` |
| `PagePropertyField` | `PnwPagePropertyField` |
| `PagePropertyGroup` | `PnwPagePropertyGroup` |
| `PagePropertiesSheet` | `PnwPagePropertiesSheet` |

---

## Store（1 个）

| 原名 | 新名 |
|------|------|
| `useAsyncTaskStore` | **`usePnwAsyncTaskStore`** |

---

## 汇总

| 类别 | 数量 | 加前缀 | 规则 |
|------|------|--------|------|
| Vue 组件 | 5 | ✅ 全部 | `PnwXxx` |
| CSS 类名 | ~60 | ✅ 全部 | `pnw-xxx` |
| 全局函数 | 30 | ✅ 全部 | `pnwXxx` |
| 全局常量 | 3 | ✅ 全部 | `PNW_XXX` |
| 全局类型 | 22 | ✅ 全部 | `PnwXxx` |
| Store | 1 | ✅ | `usePnwXxxStore` |
