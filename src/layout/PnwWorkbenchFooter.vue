<script setup lang="ts">
import { computed } from "vue";
import type {
  PnwViewBlockContributions,
  PnwViewBlockId,
  PnwViewBlockVisibility,
} from "../types/PnwWorkbenchWeb.js";
import { pnwAvailableViewBlockIds } from "../utils/pnwWorkbenchWeb.js";
import PnwIcon from "../components/PnwIcon.vue";

const props = withDefaults(defineProps<{
  contributions: PnwViewBlockContributions;
  visibility: PnwViewBlockVisibility;
  ariaLabel?: string;
}>(), {
  ariaLabel: "工作台布局开关",
});

const emit = defineEmits<{
  toggle: [blockId: PnwViewBlockId];
}>();

const pnwAvailableIds = computed(() => pnwAvailableViewBlockIds(props.contributions));

function pnwHasBlock(blockId: PnwViewBlockId): boolean {
  return pnwAvailableIds.value.includes(blockId);
}
</script>

<template>
  <footer class="pnw-workbench-footer" :aria-label="ariaLabel">
    <div v-if="$slots.default" class="pnw-workbench-footer-content">
      <slot />
    </div>
    <span class="pnw-workbench-footer-spacer" />
    <div class="pnw-workbench-footer-actions">
      <button
        type="button"
        class="pnw-workbench-footer-toggle"
        :disabled="!pnwHasBlock('primary')"
        :title="pnwHasBlock('primary') ? '显示/隐藏 Primary Block' : '当前 View 未提供 Primary Block'"
        aria-label="显示/隐藏 Primary Block"
        :aria-pressed="pnwHasBlock('primary') && visibility.primary"
        @click="emit('toggle', 'primary')"
      >
        <PnwIcon
          :name="pnwHasBlock('primary') && visibility.primary ? 'panel-left-active' : 'panel-left'"
          :size="15"
        />
      </button>
      <button
        type="button"
        class="pnw-workbench-footer-toggle"
        :disabled="!pnwHasBlock('bottom')"
        :title="pnwHasBlock('bottom') ? '显示/隐藏 Bottom Panel' : '当前 View 未提供 Bottom Panel'"
        aria-label="显示/隐藏 Bottom Panel"
        :aria-pressed="pnwHasBlock('bottom') && visibility.bottom"
        @click="emit('toggle', 'bottom')"
      >
        <PnwIcon
          :name="pnwHasBlock('bottom') && visibility.bottom ? 'panel-bottom-active' : 'panel-bottom'"
          :size="15"
        />
      </button>
      <button
        type="button"
        class="pnw-workbench-footer-toggle"
        :disabled="!pnwHasBlock('secondary')"
        :title="pnwHasBlock('secondary') ? '显示/隐藏 Secondary Block' : '当前 View 未提供 Secondary Block'"
        aria-label="显示/隐藏 Secondary Block"
        :aria-pressed="pnwHasBlock('secondary') && visibility.secondary"
        @click="emit('toggle', 'secondary')"
      >
        <PnwIcon
          :name="pnwHasBlock('secondary') && visibility.secondary ? 'panel-right-active' : 'panel-right'"
          :size="15"
        />
      </button>
    </div>
  </footer>
</template>

<style scoped>
.pnw-workbench-footer {
  min-height: 28px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  padding: 2px 6px;
  background: var(--pnw-footer-bg, var(--pnw-workbench-default-footer-bg, #eef2f7));
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  border-top: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
}

.pnw-workbench-footer-spacer {
  flex: 1 1 auto;
}

.pnw-workbench-footer-content {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-workbench-footer-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.pnw-workbench-footer-toggle {
  width: 24px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border: 1px solid transparent;
  border-radius: var(--pnw-control-radius, 5px);
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.pnw-workbench-footer-toggle:hover,
.pnw-workbench-footer-toggle:focus-visible {
  outline: none;
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09)));
}

.pnw-workbench-footer-toggle:focus-visible {
  border-color: var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
}

.pnw-workbench-footer-toggle:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.pnw-workbench-footer-toggle:disabled:hover {
  background: transparent;
}

</style>
