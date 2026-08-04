<script setup lang="ts">
import PnwSidebarBlockHead from "./PnwSidebarBlockHead.vue";

const expanded = defineModel<boolean>("expanded", { default: true });

const props = withDefaults(
  defineProps<{
    title: string;
    /** strip：侧栏条带；card：带外框属性块 */
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
  overflow: hidden;
  box-sizing: border-box;
  background: var(--sidebar-bg);
}

.pnw-sidebar-block--strip .pnw-sidebar-block-head-wrap {
  width: 100%;
  border-bottom: 1px solid var(--border);
  background: var(--panel-head-bg);
}

.pnw-sidebar-block--card {
  margin: 0 0 4px;
  border: none;
  border-top: 2px solid var(--border-strong);
  border-bottom: 2px solid var(--border-strong);
  border-radius: 0;
  background: var(--phoenix-bg-elevated);
  box-shadow: none;
}

.pnw-sidebar-block--card .pnw-sidebar-block-head-wrap {
  width: 100%;
  border-bottom: 1px solid var(--border);
  background: var(--panel-head-bg);
  border-radius: 0;
}

.pnw-sidebar-block--card.pnw-sidebar-block--collapsed .pnw-sidebar-block-head-wrap {
  border-bottom: none;
}

.pnw-sidebar-block-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pnw-sidebar-block--strip:not(.pnw-sidebar-block--collapsed) .pnw-sidebar-block-body {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  padding: 8px 10px;
  box-sizing: border-box;
}

.pnw-sidebar-block--body-inset-none:not(.pnw-sidebar-block--collapsed) .pnw-sidebar-block-body {
  gap: 0;
  width: 100%;
  padding: 0;
}

.pnw-sidebar-block--body-scroll .pnw-sidebar-block-body {
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
  border-top: 1px solid var(--el-border-color-extra-light);
}
</style>
