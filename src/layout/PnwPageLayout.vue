<script setup lang="ts">
import PnwPageHeader from "./PnwPageHeader.vue";
import PnwPageMainBlock from "./PnwPageMainBlock.vue";

withDefaults(defineProps<{
  title: string;
  subtitle?: string;
  eyebrow?: string;
  summary?: string;
  description?: string;
  toolbar?: boolean;
  /** 默认 true：结构 body 保持 0，并用 PnwPageMainBlock 为默认插槽提供 10px inset。 */
  bodyInset?: boolean;
  /** 默认 true：正文而非整个 Workbench Editor 承担滚动。 */
  bodyScroll?: boolean;
}>(), {
  toolbar: true,
  bodyInset: true,
  bodyScroll: true,
});
</script>

<template>
  <section
    class="pnw-page-layout"
    :class="{
      'pnw-page-layout--body-inset-none': !bodyInset,
      'pnw-page-layout--body-scroll': bodyScroll,
    }"
  >
    <slot name="header">
      <PnwPageHeader
        :title="title"
        :subtitle="subtitle"
        :eyebrow="eyebrow"
        :summary="summary"
        :description="description"
        :toolbar="toolbar"
      >
        <template v-if="$slots.actions" #actions>
          <slot name="actions" />
        </template>
        <template v-if="$slots.help" #help>
          <slot name="help" />
        </template>
      </PnwPageHeader>
    </slot>

    <div class="pnw-page-layout-body">
      <PnwPageMainBlock v-if="bodyInset">
        <slot />
      </PnwPageMainBlock>
      <slot v-else />
    </div>
  </section>
</template>

<style scoped>
.pnw-page-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  box-sizing: border-box;
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  background: var(
    --pnw-page-bg,
    var(--pnw-editor-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)))
  );
}

.pnw-page-layout-body {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.pnw-page-layout--body-scroll .pnw-page-layout-body {
  overflow: auto;
  overscroll-behavior: contain;
}

</style>
