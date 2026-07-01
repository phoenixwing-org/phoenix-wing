<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import {
  pnwChoiceDialogOpen,
  pnwChoiceDialogRequest,
  pnwResolveChoice,
  type PnwChoiceDialogOption,
} from "../composables/pnwChoiceDialog";

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
  <Teleport to="body">
    <div v-if="open && request" class="pnw-choice-overlay" @click.self="onCancel">
      <div class="pnw-choice-dialog" role="dialog" aria-modal="true" :aria-label="request.title">
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
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pnw-choice-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.45);
}

.pnw-choice-dialog {
  width: min(560px, calc(100vw - 48px));
  max-height: min(80vh, 640px);
  overflow: auto;
  padding: 20px 22px;
  border-radius: 10px;
  background: var(--page-bg, #fff);
  border: 1px solid var(--border-strong, #cbd5e1);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
}

.pnw-choice-title {
  margin: 0 0 10px;
  font-size: 1.05rem;
}

.pnw-choice-message {
  margin: 0 0 14px;
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--text, #0f172a);
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
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  background: var(--el-fill-color-lighter, #f8fafc);
}

.pnw-choice-check-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border, #e2e8f0);
}

.pnw-choice-check-count {
  font-size: 0.75rem;
}

.pnw-choice-check-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: min(240px, 40vh);
  overflow-y: auto;
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
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
  border-radius: 6px;
  background: var(--el-fill-color-blank, #fff);
}

.pnw-choice-path-summary {
  cursor: pointer;
  padding: 8px 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--el-text-color-regular, #475569);
  overflow-wrap: anywhere;
  word-break: break-all;
}

.pnw-choice-path-summary:hover {
  color: var(--el-text-color-primary, #0f172a);
}

.pnw-choice-path-body {
  margin: 0;
  padding: 8px 10px 10px;
  border-top: 1px solid var(--el-border-color-lighter, #e2e8f0);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-all;
  max-height: 120px;
  overflow-y: auto;
  color: var(--el-text-color-primary, #0f172a);
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
}

.pnw-choice-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pnw-choice-btn.danger {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}

.pnw-choice-btn.danger:hover:not(:disabled) {
  background: #fee2e2;
}
</style>
