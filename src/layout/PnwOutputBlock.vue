<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

const props = withDefaults(defineProps<{
  /** Consumer 已格式化的自由文本；Wing 不添加频道、级别或时间列。 */
  text: string;
  autoScroll?: boolean;
  ariaLabel?: string;
  emptyText?: string;
}>(), {
  autoScroll: true,
  ariaLabel: "输出",
  emptyText: "暂无输出",
});

const pnwOutputViewport = ref<HTMLElement>();
const pnwOutputScrollLocked = ref(false);

function pnwTrackOutputScroll(): void {
  const viewport = pnwOutputViewport.value;
  if (!viewport) return;
  pnwOutputScrollLocked.value = (
    viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - 2
  );
}

watch(() => props.text, async () => {
  if (!props.autoScroll || pnwOutputScrollLocked.value) return;
  await nextTick();
  const viewport = pnwOutputViewport.value;
  if (viewport) viewport.scrollTop = viewport.scrollHeight;
}, { flush: "post" });
</script>

<template>
  <pre
    ref="pnwOutputViewport"
    class="pnw-output-block"
    role="log"
    aria-live="polite"
    aria-relevant="additions text"
    :aria-label="ariaLabel"
    tabindex="0"
    @scroll="pnwTrackOutputScroll"
  >{{ text || emptyText }}</pre>
</template>

<style scoped>
.pnw-output-block {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  margin: 0;
  padding: 6px 9px;
  overflow: auto;
  border: 0;
  background: var(--pnw-block-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.45;
  tab-size: 2;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  outline: none;
  cursor: text;
  user-select: text;
}

.pnw-output-block:focus-visible {
  box-shadow: inset 0 0 0 1px var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
}
</style>
