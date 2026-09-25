<script setup lang="ts">
import PnwSidebarBlockHead from "./PnwSidebarBlockHead.vue";

const expanded = defineModel<boolean>("expanded", { default: true });

const props = withDefaults(
  defineProps<{
    title: string;
    /** strip：Primary 连续横线；card：Main 实线圆角外框。默认 strip 保持兼容。 */
    variant?: "strip" | "card";
    /** 内容区超出时在 block 内滚动 */
    bodyScroll?: boolean;
    /** 是否保留默认内容内边距；Primary 等贴边容器可关闭 */
    bodyInset?: boolean;
    /** 标题行可点击折叠 */
    collapsible?: boolean;
    ariaLabel?: string;
  }>(),
  {
    variant: "strip",
    bodyScroll: false,
    bodyInset: true,
    collapsible: true,
  },
);

const emit = defineEmits<{
  toggle: [expanded: boolean];
}>();

function onHeadToggle() {
  if (!props.collapsible) return;
  expanded.value = !expanded.value;
  emit("toggle", expanded.value);
}
</script>

<template>
  <section
    class="pnw-sidebar-block"
    :class="[
      `pnw-sidebar-block--${variant}`,
      {
        'pnw-sidebar-block--body-scroll': bodyScroll,
        'pnw-sidebar-block--body-inset-none': !bodyInset,
        'pnw-sidebar-block--collapsed': collapsible && !expanded,
      },
    ]"
    :aria-label="ariaLabel ?? title"
  >
    <PnwSidebarBlockHead
      class="pnw-sidebar-block-head-wrap"
      :expanded="expanded"
      :collapsible="collapsible"
      @toggle="onHeadToggle"
    >
      <template #title>
        <slot name="title">{{ title }}</slot>
      </template>
      <template v-if="$slots.suffix" #suffix>
        <slot name="suffix" />
      </template>
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </PnwSidebarBlockHead>
    <div v-show="!collapsible || expanded" class="pnw-sidebar-block-body">
      <slot />
    </div>
    <footer v-show="$slots.footer && (!collapsible || expanded)" class="pnw-sidebar-block-foot">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.pnw-sidebar-block {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  background: var(--sidebar-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)));
}

.pnw-sidebar-block--strip {
  width: 100%;
  margin: 0;
  border-inline: 0;
  border-radius: 0;
}

.pnw-sidebar-block--strip > .pnw-sidebar-block-head-wrap {
  width: 100%;
  border-block: 1px solid var(--border, var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed)));
  background: var(--pnw-block-header-bg, var(--panel-head-bg, transparent));
}

.pnw-sidebar-block--card {
  margin: 0;
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  border-radius: var(--pnw-sidebar-block-radius, 8px);
  background: var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff));
  box-shadow: none;
}

.pnw-sidebar-block--card > .pnw-sidebar-block-head-wrap {
  width: 100%;
  border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  background: var(--pnw-block-header-bg, var(--panel-head-bg, color-mix(in srgb,
    var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)) 92%,
    var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a)) 8%)));
  border-radius: 0;
}

.pnw-sidebar-block--card.pnw-sidebar-block--collapsed > .pnw-sidebar-block-head-wrap {
  border-bottom: none;
}

.pnw-sidebar-block-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pnw-sidebar-block:not(.pnw-sidebar-block--collapsed) > .pnw-sidebar-block-body {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  padding: 8px 10px;
  box-sizing: border-box;
}

.pnw-sidebar-block--body-inset-none:not(.pnw-sidebar-block--collapsed) > .pnw-sidebar-block-body {
  gap: 0;
  width: 100%;
  padding: 0;
}

.pnw-sidebar-block--body-scroll > .pnw-sidebar-block-body {
  overflow: auto;
  overscroll-behavior: contain;
}

.pnw-sidebar-block--collapsed {
  flex: 0 0 auto !important;
  height: auto !important;
  min-height: 0;
}

.pnw-sidebar-block:not(.pnw-sidebar-block--collapsed) {
  flex: 1 1 auto;
  min-height: 0;
}

.pnw-sidebar-block-foot {
  flex-shrink: 0;
  padding: 8px 10px;
  border-top: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
}
</style>
