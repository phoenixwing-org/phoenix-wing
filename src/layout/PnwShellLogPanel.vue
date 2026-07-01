<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import PnwSidebarBlock from "./PnwSidebarBlock.vue";

const props = withDefaults(
  defineProps<{
    logText: string;
    sourceLabel?: string;
    /** 空日志占位文本 */
    emptyText?: string;
    /** 标题区右侧按钮（清空、关闭 等） */
    showClear?: boolean;
    showClose?: boolean;
  }>(),
  {
    sourceLabel: "",
    emptyText: "（暂无日志）",
    showClear: true,
    showClose: true,
  },
);

const emit = defineEmits<{
  clear: [];
  close: [];
}>();

const preRef = ref<HTMLElement | null>(null);

watch(
  () => props.logText,
  async () => {
    await nextTick();
    const el = preRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  },
);
</script>

<template>
  <PnwSidebarBlock
    class="pnw-log-panel"
    title="运行日志"
    variant="strip"
    body-scroll
    aria-label="运行日志"
  >
    <template #title>
      运行日志
      <span v-if="sourceLabel" class="pnw-log-src">· {{ sourceLabel }}</span>
    </template>
    <template v-if="showClear || showClose" #actions>
      <button
        v-if="showClear"
        type="button"
        class="pnw-log-btn"
        title="清空日志"
        @click="emit('clear')"
      >清空</button>
      <button
        v-if="showClose"
        type="button"
        class="pnw-log-btn"
        title="收起日志区"
        @click="emit('close')"
      >收起</button>
    </template>
    <pre ref="preRef" class="pnw-log-body">{{ logText || emptyText }}</pre>
  </PnwSidebarBlock>
</template>

<style scoped>
.pnw-log-panel {
  border-top: 1px solid var(--border);
}

.pnw-log-panel :deep(.pnw-sidebar-block-body) {
  padding: 0;
}

.pnw-log-src {
  font-weight: 400;
  color: var(--muted);
}

.pnw-log-btn {
  padding: 2px 6px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.pnw-log-btn:hover {
  background: var(--hover-bg, #f5f7fa);
  color: var(--text);
}

.pnw-log-body {
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  padding: 6px 8px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text);
  background: transparent;
}
</style>
