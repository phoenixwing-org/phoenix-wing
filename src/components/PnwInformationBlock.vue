<script setup lang="ts">
import { computed, getCurrentInstance, ref } from "vue";
import type {
  PnwInformationBlockDefinition,
  PnwInformationBlockItem,
} from "../types/PnwInformationBlock.js";
import PnwExpandCaret from "./PnwExpandCaret.vue";

const props = withDefaults(defineProps<{
  definition: PnwInformationBlockDefinition;
  /** 受控展开状态；省略时使用 definition.defaultExpanded。 */
  expanded?: boolean;
  collapsible?: boolean;
  ariaLabel?: string;
}>(), {
  expanded: undefined,
  collapsible: true,
  ariaLabel: undefined,
});

const emit = defineEmits<{
  "update:expanded": [expanded: boolean];
  toggle: [expanded: boolean];
}>();

const pnwInternalExpanded = ref(props.definition.defaultExpanded ?? true);
const pnwExpanded = computed(() => (
  props.collapsible ? (props.expanded ?? pnwInternalExpanded.value) : true
));
const pnwContentId = `pnw-information-block-${getCurrentInstance()?.uid ?? 0}`;

function pnwToggleExpanded(): void {
  if (!props.collapsible) return;
  const next = !pnwExpanded.value;
  if (props.expanded === undefined) pnwInternalExpanded.value = next;
  emit("update:expanded", next);
  emit("toggle", next);
}
</script>

<template>
  <section
    class="pnw-information-block"
    :class="{ 'pnw-information-block--collapsed': collapsible && !pnwExpanded }"
    :aria-label="ariaLabel ?? definition.title"
    :data-pnw-information-block-id="definition.id"
    :data-pnw-information-block-expanded="pnwExpanded"
  >
    <button
      v-if="collapsible"
      type="button"
      class="pnw-information-block-header pnw-information-block-toggle"
      :aria-expanded="pnwExpanded"
      :aria-controls="pnwContentId"
      @click="pnwToggleExpanded"
    >
      <slot name="header" :definition="definition" :expanded="pnwExpanded">
        <span class="pnw-information-block-title">{{ definition.title }}</span>
        <span v-if="definition.status" class="pnw-information-block-status">
          {{ definition.status }}
        </span>
      </slot>
      <PnwExpandCaret class="pnw-information-block-caret" :expanded="pnwExpanded" inline />
    </button>

    <header v-else class="pnw-information-block-header pnw-information-block-static-header">
      <slot name="header" :definition="definition" :expanded="true">
        <span class="pnw-information-block-title">{{ definition.title }}</span>
        <span v-if="definition.status" class="pnw-information-block-status">
          {{ definition.status }}
        </span>
      </slot>
    </header>

    <div v-show="pnwExpanded" :id="pnwContentId" class="pnw-information-block-content">
      <dl v-if="definition.items.length > 0" class="pnw-information-block-list">
        <template v-for="(item, index) in definition.items" :key="item.id">
          <slot name="item" :item="item" :index="index" :definition="definition">
            <div class="pnw-information-block-item" :data-pnw-information-item-id="item.id">
              <dt class="pnw-information-block-label">{{ item.label }}</dt>
              <dd class="pnw-information-block-value">{{ item.value }}</dd>
              <dd v-if="item.note" class="pnw-information-block-note">{{ item.note }}</dd>
            </div>
          </slot>
        </template>
      </dl>
      <footer v-if="$slots.footer" class="pnw-information-block-footer">
        <slot name="footer" :definition="definition" />
      </footer>
    </div>
  </section>
</template>

<style scoped>
.pnw-information-block {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  border-radius: var(--pnw-information-block-radius, 8px);
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  background: var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff));
}

.pnw-information-block-header {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 38px;
  margin: 0;
  padding: 8px 12px;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  box-sizing: border-box;
}

.pnw-information-block-toggle {
  cursor: pointer;
}

.pnw-information-block-toggle:hover {
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgb(59 130 246 / 9%)));
}

.pnw-information-block-toggle:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
  outline-offset: -2px;
}

.pnw-information-block-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-information-block-status {
  flex: none;
  max-width: 42%;
  overflow: hidden;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 0.8125rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-information-block-caret {
  flex: none;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
}

.pnw-information-block-content {
  border-top: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
}

.pnw-information-block-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
}

.pnw-information-block-item {
  display: grid;
  grid-template-columns: minmax(88px, 0.38fr) minmax(0, 1fr);
  gap: 2px 12px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
}

.pnw-information-block-item:last-child {
  border-bottom: 0;
}

.pnw-information-block-label,
.pnw-information-block-value,
.pnw-information-block-note {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.pnw-information-block-label,
.pnw-information-block-note {
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
}

.pnw-information-block-label {
  font-size: 0.8125rem;
  font-weight: 600;
}

.pnw-information-block-value {
  font-weight: 550;
}

.pnw-information-block-note {
  grid-column: 2;
  font-size: 0.75rem;
  line-height: 1.45;
}

.pnw-information-block-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
}

@media (max-width: 560px) {
  .pnw-information-block-item {
    grid-template-columns: minmax(0, 1fr);
    gap: 3px;
  }

  .pnw-information-block-note {
    grid-column: 1;
  }
}
</style>
