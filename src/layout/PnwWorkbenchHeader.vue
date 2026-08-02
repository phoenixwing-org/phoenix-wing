<script setup lang="ts">
import { computed } from "vue";
import { usePnwLocale } from "../composables/usePnwLocale.js";

const props = withDefaults(defineProps<{
  ariaLabel?: string;
  /** 条件 slot 在 Vue 中仍可能被注册；由组合壳显式控制空页签区。 */
  showPages?: boolean;
  /** 最大化时只保留承载还原动作的 View 标签区。 */
  editorMaximized?: boolean;
}>(), {
  ariaLabel: "",
  showPages: true,
  editorMaximized: false,
});

const { t: pnwT } = usePnwLocale();
const pnwAriaLabel = computed(() => props.ariaLabel || pnwT("workbench.header"));
</script>

<template>
  <header
    class="pnw-workbench-header"
    :class="{ 'pnw-workbench-header--editor-maximized': editorMaximized }"
    :aria-label="pnwAriaLabel"
  >
    <div v-if="!editorMaximized && $slots.brand" class="pnw-workbench-header-brand">
      <slot name="brand" />
    </div>
    <div v-if="!editorMaximized && $slots.modules" class="pnw-workbench-header-modules">
      <slot name="modules" />
    </div>
    <div v-if="showPages && $slots.pages" class="pnw-workbench-header-pages">
      <slot name="pages" />
    </div>
    <div v-if="!editorMaximized && $slots.actions" class="pnw-workbench-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.pnw-workbench-header {
  width: 100%;
  height: var(--pnw-workbench-header-height, 48px);
  min-height: var(--pnw-workbench-header-height, 48px);
  display: flex;
  align-items: stretch;
  gap: 0;
  overflow: hidden;
  box-sizing: border-box;
  border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  background: var(--pnw-header-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  box-shadow: var(--pnw-header-shadow, 0 2px 8px rgba(15, 23, 42, 0.06));
}

.pnw-workbench-header-brand,
.pnw-workbench-header-modules,
.pnw-workbench-header-pages,
.pnw-workbench-header-actions {
  position: relative;
  z-index: var(--pnw-workbench-overlay-host-tools, 1400);
  min-width: 0;
  display: flex;
  align-items: stretch;
}

.pnw-workbench-header--editor-maximized .pnw-workbench-header-pages {
  width: 100%;
}

.pnw-workbench-header-brand,
.pnw-workbench-header-modules,
.pnw-workbench-header-actions {
  flex: 0 0 auto;
}

.pnw-workbench-header-modules {
  max-width: var(--pnw-workbench-header-modules-max-width, min(36vw, 360px));
  overflow: hidden;
}

.pnw-workbench-header-brand,
.pnw-workbench-header-modules {
  border-right: 1px solid var(--pnw-header-divider, var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed)));
}

.pnw-workbench-header-pages {
  flex: 1 1 auto;
  overflow: hidden;
}

.pnw-workbench-header-actions {
  justify-content: flex-end;
  margin-left: auto;
  border-left: 1px solid var(--pnw-header-divider, var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed)));
}

.pnw-workbench-header :deep(button) {
  font-family: inherit;
}

@container pnw-workbench (max-width: 720px) {
  .pnw-workbench-header {
    --pnw-workbench-header-height: 44px;
  }

  .pnw-workbench-header-brand {
    max-width: 48px;
    overflow: hidden;
  }

  .pnw-workbench-header-modules {
    max-width: 46%;
    overflow-x: auto;
    overflow-y: hidden;
  }
}
</style>
