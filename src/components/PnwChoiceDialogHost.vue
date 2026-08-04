<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { ElCheckbox, ElCheckboxGroup } from "element-plus";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import {
  pnwChoiceDialogOpen,
  pnwChoiceDialogRequest,
  pnwResolveChoice,
  type PnwChoiceDialogOption,
} from "../composables/pnwChoiceDialog";
import PnwAppModalOverlay from "./PnwAppModalOverlay.vue";

defineProps<{
  /** 显式覆盖全局 overlay scheme；缺省跟随 Host 的 pnwApplyColorScheme。 */
  colorScheme?: PnwColorScheme;
}>();

const open = pnwChoiceDialogOpen;
const request = pnwChoiceDialogRequest;

const checkedIds = ref<string[]>([]);

const choices = computed(() => request.value?.choices ?? []);

const checkboxItems = computed(() => request.value?.checkboxes?.items ?? []);

const hasCheckboxes = computed(() => checkboxItems.value.length > 0);

const messageLines = computed(() => {
  const msg = request.value?.message ?? "";
  return msg.split("\n");
});

function isLongPathLine(line: string): boolean {
  const t = line.trim();
  return t.length > 48 && t.includes("/") && !/\s/.test(t);
}

function pathSummary(line: string): string {
  const t = line.trim();
  if (t.length <= 56) return t;
  const head = 22;
  const tail = 28;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

const defaultChoiceId = computed(
  () =>
    request.value?.defaultChoiceId ??
    request.value?.choices.find((c) => c.id === "cancel")?.id ??
    request.value?.choices[0]?.id,
);

const allCheckboxIds = computed(() => checkboxItems.value.map((item) => item.id));

const allChecked = computed({
  get: () =>
    allCheckboxIds.value.length > 0 && checkedIds.value.length === allCheckboxIds.value.length,
  set: (on: boolean) => {
    checkedIds.value = on ? [...allCheckboxIds.value] : [];
  },
});

const someChecked = computed(
  () => checkedIds.value.length > 0 && checkedIds.value.length < allCheckboxIds.value.length,
);

function initCheckedIds() {
  const req = request.value;
  if (!req?.checkboxes?.items.length) {
    checkedIds.value = [];
    return;
  }
  const all = req.checkboxes.items.map((item) => item.id);
  const defaults = req.checkboxes.defaultSelectedIds;
  checkedIds.value =
    defaults?.length ? defaults.filter((id) => all.includes(id)) : [...all];
}

function isChoiceDisabled(opt: PnwChoiceDialogOption): boolean {
  if (opt.disabled) return true;
  if (hasCheckboxes.value && opt.id === "adopt-selected" && checkedIds.value.length === 0) {
    return true;
  }
  return false;
}

function onChoose(opt: PnwChoiceDialogOption) {
  if (isChoiceDisabled(opt)) return;
  pnwResolveChoice(opt.id, [...checkedIds.value]);
}

function onCancel() {
  pnwResolveChoice(null, [...checkedIds.value]);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    onCancel();
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    initCheckedIds();
    window.addEventListener("keydown", onKeydown);
  } else {
    window.removeEventListener("keydown", onKeydown);
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <PnwAppModalOverlay
    :open="open && request !== null"
    :aria-label="request?.title ?? '选择对话框'"
    panel-class="pnw-choice-dialog"
    :color-scheme="colorScheme"
    @close="onCancel"
  >
    <template v-if="request">
        <h2 class="pnw-choice-title">{{ request.title }}</h2>
        <div class="pnw-choice-message">
          <template v-for="(line, idx) in messageLines" :key="idx">
            <details v-if="line && isLongPathLine(line)" class="pnw-choice-path-fold">
              <summary class="pnw-choice-path-summary">{{ pathSummary(line) }}</summary>
              <pre class="pnw-choice-path-body">{{ line.trim() }}</pre>
            </details>
            <p v-else-if="line" class="pnw-choice-message-line">{{ line }}</p>
          </template>
        </div>

        <div v-if="hasCheckboxes" class="pnw-choice-checkboxes">
          <div class="pnw-choice-check-toolbar">
            <el-checkbox
              v-model="allChecked"
              :indeterminate="someChecked"
              size="small"
            >
              全选
            </el-checkbox>
            <span class="pnw-choice-check-count muted small">
              已选 {{ checkedIds.length }} / {{ allCheckboxIds.length }}
            </span>
          </div>
          <el-checkbox-group v-model="checkedIds" class="pnw-choice-check-list">
            <el-checkbox
              v-for="item in checkboxItems"
              :key="item.id"
              :value="item.id"
              class="pnw-choice-check-item"
            >
              <span class="pnw-choice-check-label">{{ item.label }}</span>
            </el-checkbox>
          </el-checkbox-group>
        </div>

        <div class="pnw-choice-actions">
          <button
            v-for="opt in choices"
            :key="opt.id"
            type="button"
            class="btn pnw-choice-btn"
            :class="{
              primary: opt.variant === 'primary',
              danger: opt.variant === 'danger',
            }"
            :disabled="isChoiceDisabled(opt)"
            :autofocus="opt.id === defaultChoiceId"
            @click="onChoose(opt)"
          >
            {{ opt.label }}
          </button>
        </div>
    </template>
  </PnwAppModalOverlay>
</template>

<style scoped>
:global(.pnw-modal-panel.pnw-choice-dialog) {
  width: min(560px, calc(100vw - 48px));
  max-height: min(80vh, 640px);
  padding: 20px 22px;
  border-radius: 10px;
}

.pnw-choice-title {
  margin: 0 0 10px;
  font-size: 1.05rem;
}

.pnw-choice-message {
  margin: 0 0 14px;
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
}

.pnw-choice-message-line {
  margin: 0 0 8px;
}

.pnw-choice-message-line:last-child {
  margin-bottom: 0;
}

.pnw-choice-checkboxes {
  margin: 0 0 16px;
  padding: 10px 12px;
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #e2e8f0));
  border-radius: 8px;
  background: var(--pnw-workbench-bg, var(--pnw-workbench-default-bg, #f8fafc));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
}

.pnw-choice-check-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #e2e8f0));
}

.pnw-choice-check-count {
  font-size: 0.75rem;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
}

.pnw-choice-check-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: min(240px, 40vh);
  overflow-y: auto;
}

.pnw-choice-checkboxes :deep(.el-checkbox) {
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
}

.pnw-choice-checkboxes :deep(.el-checkbox__label) {
  color: inherit;
}

.pnw-choice-checkboxes :deep(.el-checkbox__inner) {
  border-color: var(--pnw-workbench-border, var(--pnw-workbench-default-border, #cbd5e1));
  background: var(--pnw-control-bg, var(--pnw-workbench-default-control-bg, #fff));
}

.pnw-choice-checkboxes :deep(.el-checkbox__input.is-checked .el-checkbox__inner),
.pnw-choice-checkboxes :deep(.el-checkbox__input.is-indeterminate .el-checkbox__inner) {
  border-color: var(--pnw-primary-bg, var(--pnw-workbench-default-primary-bg, #2563eb));
  background: var(--pnw-primary-bg, var(--pnw-workbench-default-primary-bg, #2563eb));
}

.pnw-choice-checkboxes :deep(.el-checkbox__input.is-focus .el-checkbox__inner) {
  outline: 2px solid var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
  outline-offset: 1px;
}

.pnw-choice-check-item {
  margin-right: 0;
  height: auto;
  align-items: flex-start;
}

.pnw-choice-check-item :deep(.el-checkbox__label) {
  line-height: 1.4;
  white-space: normal;
  word-break: break-word;
}

.pnw-choice-check-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.82rem;
}

.pnw-choice-path-fold {
  margin: 0 0 10px;
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #e2e8f0));
  border-radius: 6px;
  background: var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff));
}

.pnw-choice-path-summary {
  cursor: pointer;
  padding: 8px 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #475569));
  overflow-wrap: anywhere;
  word-break: break-all;
}

.pnw-choice-path-summary:hover {
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
}

.pnw-choice-path-body {
  margin: 0;
  padding: 8px 10px 10px;
  border-top: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #e2e8f0));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-all;
  max-height: 120px;
  overflow-y: auto;
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
}

.pnw-choice-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pnw-choice-btn {
  width: 100%;
  text-align: center;
  padding: 10px 14px;
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #cbd5e1));
  border-radius: var(--pnw-control-radius, 6px);
  background: var(--pnw-control-bg, var(--pnw-workbench-default-control-bg, #fff));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  cursor: pointer;
  font: inherit;
}

.pnw-choice-btn:hover:not(:disabled) {
  background: var(
    --pnw-control-hover-bg,
    var(--pnw-workbench-default-control-hover-bg, #f1f5f9)
  );
}

.pnw-choice-btn:focus-visible {
  outline: 2px solid var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
  outline-offset: 1px;
}

.pnw-choice-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pnw-choice-btn.danger {
  background: var(--pnw-danger-bg, var(--pnw-workbench-default-danger-bg, #fef2f2));
  border-color: var(--pnw-danger-border, var(--pnw-workbench-default-danger-border, #fecaca));
  color: var(--pnw-danger-text, var(--pnw-workbench-default-danger-text, #b91c1c));
}

.pnw-choice-btn.danger:hover:not(:disabled) {
  background: var(
    --pnw-danger-hover-bg,
    var(--pnw-workbench-default-danger-hover-bg, #fee2e2)
  );
}

.pnw-choice-btn.primary {
  border-color: var(--pnw-primary-bg, var(--pnw-workbench-default-primary-bg, #2563eb));
  background: var(--pnw-primary-bg, var(--pnw-workbench-default-primary-bg, #2563eb));
  color: var(--pnw-primary-text, var(--pnw-workbench-default-primary-text, #fff));
}

.pnw-choice-btn.primary:hover:not(:disabled) {
  border-color: var(
    --pnw-primary-hover-bg,
    var(--pnw-workbench-default-primary-hover-bg, #1d4ed8)
  );
  background: var(
    --pnw-primary-hover-bg,
    var(--pnw-workbench-default-primary-hover-bg, #1d4ed8)
  );
}
</style>
