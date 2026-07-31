<script setup lang="ts">
import { computed } from "vue";
import type {
  PnwProblemItem,
  PnwProblemSeverity,
} from "../types/PnwDiagnostics.js";
import { pnwFilterProblemItems } from "../utils/pnwDiagnostics.js";

const PNW_PROBLEM_SEVERITIES = ["error", "warning", "info"] as const;

const props = withDefaults(defineProps<{
  items: readonly PnwProblemItem[];
  severities?: readonly PnwProblemSeverity[];
  source?: string;
  filterText?: string;
  showToolbar?: boolean;
  ariaLabel?: string;
  emptyText?: string;
}>(), {
  severities: () => ["error", "warning", "info"],
  source: "",
  filterText: "",
  showToolbar: true,
  ariaLabel: "问题",
  emptyText: "未检测到问题",
});

const emit = defineEmits<{
  "update:severities": [severities: readonly PnwProblemSeverity[]];
  "update:source": [source: string];
  "update:filterText": [filterText: string];
  open: [item: PnwProblemItem];
}>();

const pnwProblemSources = computed(() => [
  ...new Set(props.items.map((item) => item.source).filter(
    (source): source is string => Boolean(source),
  )),
].sort());
const pnwFilteredProblems = computed(() => pnwFilterProblemItems(props.items, {
  severities: props.severities,
  ...(props.source ? { source: props.source } : {}),
  text: props.filterText,
}));

function pnwToggleProblemSeverity(severity: PnwProblemSeverity): void {
  const next = new Set(props.severities);
  if (next.has(severity)) next.delete(severity);
  else next.add(severity);
  emit(
    "update:severities",
    PNW_PROBLEM_SEVERITIES.filter((candidate) => next.has(candidate)),
  );
}

function pnwUpdateProblemSource(event: Event): void {
  emit("update:source", (event.currentTarget as HTMLSelectElement).value);
}

function pnwUpdateProblemFilter(event: Event): void {
  emit("update:filterText", (event.currentTarget as HTMLInputElement).value);
}

function pnwProblemLocation(item: PnwProblemItem): string {
  if (!item.resource) return "";
  if (item.line === undefined) return item.resource;
  return `${item.resource}:${item.line}${item.column === undefined ? "" : `:${item.column}`}`;
}
</script>

<template>
  <section class="pnw-problems-block" :aria-label="ariaLabel">
    <div v-if="showToolbar" class="pnw-problems-block-toolbar" role="toolbar" :aria-label="`${ariaLabel}过滤`">
      <div class="pnw-problems-block-severities" aria-label="问题级别">
        <button
          v-for="severity in PNW_PROBLEM_SEVERITIES"
          :key="severity"
          type="button"
          :class="`pnw-problems-block-severity--${severity}`"
          :aria-pressed="severities.includes(severity)"
          @click="pnwToggleProblemSeverity(severity)"
        >{{ severity }}</button>
      </div>
      <select
        class="pnw-problems-block-select"
        :value="source"
        aria-label="问题来源"
        @change="pnwUpdateProblemSource"
      >
        <option value="">全部来源</option>
        <option v-for="candidate in pnwProblemSources" :key="candidate" :value="candidate">
          {{ candidate }}
        </option>
      </select>
      <input
        class="pnw-problems-block-filter"
        type="search"
        :value="filterText"
        placeholder="过滤问题"
        aria-label="过滤问题"
        @input="pnwUpdateProblemFilter"
      >
    </div>

    <div class="pnw-problems-block-list" role="list">
      <div v-if="pnwFilteredProblems.length === 0" class="pnw-problems-block-empty">
        {{ emptyText }}
      </div>
      <div
        v-for="item in pnwFilteredProblems"
        v-else
        :key="`${item.ownerId}:${item.id}`"
        role="listitem"
      >
        <component
          :is="item.resource ? 'button' : 'div'"
          class="pnw-problems-block-row"
          :class="`pnw-problems-block-row--${item.severity}`"
          :type="item.resource ? 'button' : undefined"
          :title="item.details"
          @click="item.resource && emit('open', item)"
        >
          <strong>{{ item.severity.toUpperCase() }}</strong>
          <span class="pnw-problems-block-message">{{ item.message }}</span>
          <code>{{ item.code ?? "" }}</code>
          <span class="pnw-problems-block-source">{{ item.source ?? "" }}</span>
          <span class="pnw-problems-block-location">{{ pnwProblemLocation(item) }}</span>
        </component>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pnw-problems-block { min-width: 0; min-height: 0; height: 100%; display: flex; flex-direction: column; color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a)); background: var(--pnw-block-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff))); }
.pnw-problems-block-toolbar { min-height: 30px; display: flex; flex: 0 0 auto; align-items: center; gap: 5px; padding: 3px 6px; border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed)); }
.pnw-problems-block-severities { display: inline-flex; gap: 2px; }
.pnw-problems-block-toolbar button,
.pnw-problems-block-select,
.pnw-problems-block-filter { min-height: 23px; box-sizing: border-box; border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed)); border-radius: 4px; background: var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)); color: inherit; font: inherit; font-size: 10px; }
.pnw-problems-block-severities button { padding: 0 5px; color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b)); text-transform: uppercase; }
.pnw-problems-block-severities button[aria-pressed="true"] { border-color: currentColor; background: var(--pnw-control-active-bg, var(--pnw-workbench-default-active-bg, rgba(37, 99, 235, 0.13))); }
.pnw-problems-block-severities .pnw-problems-block-severity--warning[aria-pressed="true"] { color: #b45309; }
.pnw-problems-block-severities .pnw-problems-block-severity--error[aria-pressed="true"] { color: #dc2626; }
.pnw-problems-block-select { max-width: 140px; }
.pnw-problems-block-filter { min-width: 80px; flex: 1 1 160px; padding: 0 6px; }
.pnw-problems-block-toolbar button:hover,
.pnw-problems-block-toolbar button:focus-visible,
.pnw-problems-block-select:focus-visible,
.pnw-problems-block-filter:focus-visible { outline: none; border-color: var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6)); }
.pnw-problems-block-list { min-height: 0; flex: 1 1 auto; overflow: auto; padding: 3px 0; font-size: 10px; }
.pnw-problems-block-row { min-width: 100%; display: grid; grid-template-columns: 58px minmax(220px, 1fr) auto auto minmax(120px, auto); gap: 8px; align-items: baseline; box-sizing: border-box; padding: 3px 8px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; }
button.pnw-problems-block-row { cursor: pointer; }
.pnw-problems-block-row:hover,
.pnw-problems-block-row:focus-visible { outline: none; background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09))); }
.pnw-problems-block-row strong { font-size: 9px; }
.pnw-problems-block-row--warning strong { color: #b45309; }
.pnw-problems-block-row--error strong { color: #dc2626; }
.pnw-problems-block-row code,
.pnw-problems-block-source,
.pnw-problems-block-location { color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b)); white-space: nowrap; }
.pnw-problems-block-message { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pnw-problems-block-empty { padding: 7px 9px; color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b)); }

@container pnw-workbench (max-width: 560px) {
  .pnw-problems-block-toolbar { flex-wrap: wrap; }
  .pnw-problems-block-row { grid-template-columns: 52px minmax(180px, 1fr) auto; }
  .pnw-problems-block-source,
  .pnw-problems-block-row code { display: none; }
}
</style>
