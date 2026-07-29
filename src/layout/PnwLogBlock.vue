<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { PnwLogEntry, PnwLogLevel } from "../types/PnwDiagnostics.js";
import {
  pnwDiagnosticsLogChannels,
  pnwFilterLogEntries,
} from "../utils/pnwDiagnostics.js";

const PNW_LOG_LEVELS = ["debug", "info", "warning", "error"] as const;

const props = withDefaults(defineProps<{
  entries: readonly PnwLogEntry[];
  channel?: string;
  levels?: readonly PnwLogLevel[];
  filterText?: string;
  autoScroll?: boolean;
  showToolbar?: boolean;
  ariaLabel?: string;
  emptyText?: string;
}>(), {
  channel: "",
  levels: () => ["debug", "info", "warning", "error"],
  filterText: "",
  autoScroll: true,
  showToolbar: true,
  ariaLabel: "运行日志",
  emptyText: "暂无运行日志",
});

const emit = defineEmits<{
  "update:channel": [channel: string];
  "update:levels": [levels: readonly PnwLogLevel[]];
  "update:filterText": [filterText: string];
  clear: [channel?: string];
}>();

const pnwLogViewport = ref<HTMLElement>();
const pnwChannels = computed(() => pnwDiagnosticsLogChannels(props.entries));
const pnwFilteredEntries = computed(() => pnwFilterLogEntries(props.entries, {
  ...(props.channel ? { channel: props.channel } : {}),
  levels: props.levels,
  text: props.filterText,
}));

function pnwToggleLogLevel(level: PnwLogLevel): void {
  const next = new Set(props.levels);
  if (next.has(level)) next.delete(level);
  else next.add(level);
  emit("update:levels", PNW_LOG_LEVELS.filter((candidate) => next.has(candidate)));
}

function pnwUpdateLogChannel(event: Event): void {
  emit("update:channel", (event.currentTarget as HTMLSelectElement).value);
}

function pnwUpdateLogFilter(event: Event): void {
  emit("update:filterText", (event.currentTarget as HTMLInputElement).value);
}

function pnwFormatLogTime(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  const pnwPad = (value: number) => String(value).padStart(2, "0");
  return `${pnwPad(date.getHours())}:${pnwPad(date.getMinutes())}:${pnwPad(date.getSeconds())}`;
}

function pnwLogDateTime(timestamp: number): string | undefined {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

watch(pnwFilteredEntries, async () => {
  if (!props.autoScroll) return;
  await nextTick();
  const viewport = pnwLogViewport.value;
  if (viewport) viewport.scrollTop = viewport.scrollHeight;
}, { flush: "post" });
</script>

<template>
  <section class="pnw-log-block" :aria-label="ariaLabel">
    <div v-if="showToolbar" class="pnw-log-block-toolbar" role="toolbar" :aria-label="`${ariaLabel}过滤`">
      <select
        class="pnw-log-block-select"
        :value="channel"
        aria-label="日志频道"
        @change="pnwUpdateLogChannel"
      >
        <option value="">全部频道</option>
        <option v-for="candidate in pnwChannels" :key="candidate" :value="candidate">
          {{ candidate }}
        </option>
      </select>
      <div class="pnw-log-block-levels" aria-label="日志级别">
        <button
          v-for="level in PNW_LOG_LEVELS"
          :key="level"
          type="button"
          :class="`pnw-log-block-level--${level}`"
          :aria-pressed="levels.includes(level)"
          @click="pnwToggleLogLevel(level)"
        >{{ level }}</button>
      </div>
      <input
        class="pnw-log-block-filter"
        type="search"
        :value="filterText"
        placeholder="过滤日志"
        aria-label="过滤日志"
        @input="pnwUpdateLogFilter"
      >
      <button
        type="button"
        class="pnw-log-block-clear"
        @click="emit('clear', channel || undefined)"
      >清空</button>
    </div>

    <div
      ref="pnwLogViewport"
      class="pnw-log-block-viewport"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
    >
      <div v-if="pnwFilteredEntries.length === 0" class="pnw-log-block-empty">
        {{ emptyText }}
      </div>
      <div
        v-for="entry in pnwFilteredEntries"
        v-else
        :key="entry.id"
        class="pnw-log-block-row"
        :class="`pnw-log-block-row--${entry.level}`"
        :title="entry.details"
      >
        <time :datetime="pnwLogDateTime(entry.timestamp)">
          {{ pnwFormatLogTime(entry.timestamp) }}
        </time>
        <strong>{{ entry.level.toUpperCase() }}</strong>
        <span class="pnw-log-block-channel">{{ entry.channel }}</span>
        <span class="pnw-log-block-source">{{ entry.source ?? "" }}</span>
        <span class="pnw-log-block-message">{{ entry.message }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pnw-log-block { min-width: 0; min-height: 0; height: 100%; display: flex; flex-direction: column; color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a)); background: var(--pnw-block-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff))); }
.pnw-log-block-toolbar { min-height: 30px; display: flex; flex: 0 0 auto; align-items: center; gap: 5px; padding: 3px 6px; border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed)); }
.pnw-log-block-select,
.pnw-log-block-filter,
.pnw-log-block-toolbar button { min-height: 23px; box-sizing: border-box; border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed)); border-radius: 4px; background: var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)); color: inherit; font: inherit; font-size: 10px; }
.pnw-log-block-select { max-width: 150px; }
.pnw-log-block-levels { display: inline-flex; gap: 2px; }
.pnw-log-block-levels button { padding: 0 5px; color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b)); text-transform: uppercase; }
.pnw-log-block-levels button[aria-pressed="true"] { border-color: currentColor; background: var(--pnw-control-active-bg, var(--pnw-workbench-default-active-bg, rgba(37, 99, 235, 0.13))); }
.pnw-log-block-levels .pnw-log-block-level--warning[aria-pressed="true"] { color: #b45309; }
.pnw-log-block-levels .pnw-log-block-level--error[aria-pressed="true"] { color: #dc2626; }
.pnw-log-block-filter { min-width: 80px; flex: 1 1 160px; padding: 0 6px; }
.pnw-log-block-clear { flex: 0 0 auto; padding: 0 7px; cursor: pointer; }
.pnw-log-block-toolbar button:hover,
.pnw-log-block-toolbar button:focus-visible,
.pnw-log-block-select:focus-visible,
.pnw-log-block-filter:focus-visible { outline: none; border-color: var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6)); }
.pnw-log-block-viewport { min-height: 0; flex: 1 1 auto; overflow: auto; padding: 3px 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; line-height: 1.45; }
.pnw-log-block-row { min-width: max-content; display: grid; grid-template-columns: 58px 52px minmax(84px, 140px) auto minmax(220px, 1fr); gap: 7px; align-items: baseline; padding: 2px 8px; }
.pnw-log-block-row:hover { background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09))); }
.pnw-log-block-row time,
.pnw-log-block-channel,
.pnw-log-block-source { color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b)); }
.pnw-log-block-row strong { font-size: 9px; }
.pnw-log-block-row--warning strong { color: #b45309; }
.pnw-log-block-row--error strong { color: #dc2626; }
.pnw-log-block-message { white-space: pre-wrap; word-break: break-word; }
.pnw-log-block-empty { padding: 7px 9px; color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b)); }

@container pnw-workbench (max-width: 560px) {
  .pnw-log-block-toolbar { flex-wrap: wrap; }
  .pnw-log-block-row { grid-template-columns: 52px 48px minmax(70px, 110px) minmax(180px, 1fr); }
  .pnw-log-block-source { display: none; }
}
</style>
