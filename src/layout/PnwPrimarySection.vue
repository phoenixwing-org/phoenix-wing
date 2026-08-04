<script setup lang="ts">
import { computed, getCurrentInstance, ref } from "vue";
import PnwExpandCaret from "../components/PnwExpandCaret.vue";

const props = withDefaults(defineProps<{
  title: string;
  /** 受控展开状态；省略时使用内部状态。 */
  expanded?: boolean;
  /** 非受控模式的初始展开状态。 */
  defaultExpanded?: boolean;
  /** 小 Section 默认可折叠。 */
  collapsible?: boolean;
  ariaLabel?: string;
}>(), {
  defaultExpanded: true,
  collapsible: true,
});

const emit = defineEmits<{
  "update:expanded": [expanded: boolean];
  toggle: [expanded: boolean];
}>();

const pnwInstance = getCurrentInstance();
const pnwInternalExpanded = ref(props.defaultExpanded);
const pnwControlled = computed(() => {
  const pnwVNodeProps = pnwInstance?.vnode.props;
  return Boolean(pnwVNodeProps && Object.prototype.hasOwnProperty.call(pnwVNodeProps, "expanded"));
});
const pnwExpanded = computed(() => (
  pnwControlled.value ? props.expanded : pnwInternalExpanded.value
));

function pnwToggleSection(): void {
  if (!props.collapsible) return;
  const next = !pnwExpanded.value;
  if (!pnwControlled.value) pnwInternalExpanded.value = next;
  emit("update:expanded", next);
  emit("toggle", next);
}
</script>

<template>
  <section
    class="pnw-primary-section"
    :class="{ 'pnw-primary-section--collapsed': collapsible && !pnwExpanded }"
    :aria-label="ariaLabel ?? title"
    :data-pnw-primary-section-expanded="pnwExpanded"
  >
    <header class="pnw-primary-section-header">
      <button
        v-if="collapsible"
        type="button"
        class="pnw-primary-section-toggle"
        :aria-expanded="pnwExpanded"
        @click="pnwToggleSection"
      >
        <span class="pnw-primary-section-title">
          <slot name="title">{{ title }}</slot>
        </span>
        <span v-if="$slots.suffix" class="pnw-primary-section-suffix">
          <slot name="suffix" />
        </span>
        <PnwExpandCaret :expanded="pnwExpanded" inline />
      </button>
      <div v-else class="pnw-primary-section-static-title">
        <span class="pnw-primary-section-title">
          <slot name="title">{{ title }}</slot>
        </span>
        <span v-if="$slots.suffix" class="pnw-primary-section-suffix">
          <slot name="suffix" />
        </span>
      </div>
      <div v-if="$slots.actions" class="pnw-primary-section-actions">
        <slot name="actions" />
      </div>
    </header>
    <div v-show="!collapsible || pnwExpanded" class="pnw-primary-section-body">
      <slot name="body">
        <slot />
      </slot>
    </div>
  </section>
</template>

<style scoped>
.pnw-primary-section {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 0;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  border-radius: 0;
}

.pnw-primary-section-header {
  display: flex;
  flex: 0 0 auto;
  align-items: stretch;
  width: 100%;
  min-height: 28px;
  background: var(
    --pnw-primary-section-header-bg,
    color-mix(
      in srgb,
      var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)) 84%,
      var(--pnw-workbench-bg, var(--pnw-workbench-default-bg, #f1f5f9)) 16%
    )
  );
}

.pnw-primary-section-toggle,
.pnw-primary-section-static-title {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-width: 0;
  min-height: 28px;
  margin: 0;
  padding: 4px 8px;
  color: inherit;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  line-height: 20px;
  text-align: left;
  background: transparent;
  border: 0;
  box-sizing: border-box;
}

.pnw-primary-section-toggle {
  cursor: pointer;
}

.pnw-primary-section-toggle:hover {
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09)));
}

.pnw-primary-section-toggle:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
  outline-offset: -2px;
}

.pnw-primary-section-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-primary-section-suffix {
  flex: 0 0 auto;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 12px;
  font-weight: 400;
}

.pnw-primary-section-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
  padding: 0 6px 0 2px;
}

.pnw-primary-section-body {
  display: block;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: var(--pnw-primary-section-body-padding, 0);
  box-sizing: border-box;
}

.pnw-primary-section-body[style*="display: none"] {
  height: 0;
  overflow: hidden;
}
</style>
