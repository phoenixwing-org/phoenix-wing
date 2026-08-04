<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  /** 标题上方的短分类；适合模块、状态或产品域，不承担路由语义。 */
  eyebrow?: string;
  /** 与 eyebrow 同行的紧凑摘要。 */
  summary?: string;
  /** 标题下方的单段说明；复杂帮助内容继续使用 help slot。 */
  description?: string;
  /** 默认 true：三栏网格（标题 · 居中工具条 · 帮助区） */
  toolbar?: boolean;
}>();
</script>

<template>
  <header class="pnw-page-head">
    <div class="pnw-head-row" :class="{ 'pnw-head-row-toolbar': toolbar !== false }">
      <div class="pnw-head-left">
        <div v-if="eyebrow || summary" class="pnw-head-meta">
          <span v-if="eyebrow" class="pnw-head-eyebrow">{{ eyebrow }}</span>
          <span v-if="summary" class="pnw-head-summary">{{ summary }}</span>
        </div>
        <div class="pnw-head-title-row">
          <h1 class="pnw-page-title">{{ title }}</h1>
          <span v-if="subtitle" class="pnw-head-subtitle">{{ subtitle }}</span>
        </div>
        <p v-if="description" class="pnw-head-description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="pnw-head-actions">
        <slot name="actions" />
      </div>
      <div v-if="$slots.help" class="pnw-head-help">
        <slot name="help" />
      </div>
    </div>
  </header>
</template>

<style>
.pnw-page-head {
  display: flex;
  align-items: center;
  /* 32px Host action + 6px block padding + 1px border stays inside 40px. */
  padding: var(--pnw-page-header-padding, 3px 12px);
  border-bottom: 1px solid var(
    --pnw-workbench-border,
    var(--pnw-workbench-default-border, var(--border, #e2e8f0))
  );
  background: var(--pnw-page-header-bg, var(--page-bg, transparent));
  flex-shrink: 0;
  min-height: var(--pnw-workbench-view-header-height, 40px);
  box-sizing: border-box;
  color: var(
    --pnw-page-header-text,
    var(--pnw-workbench-text, var(--pnw-workbench-default-text, var(--text, #0f172a)))
  );
}

.pnw-page-head::before {
  width: var(--pnw-workbench-view-header-leading-space, 0px);
  flex: 0 0 var(--pnw-workbench-view-header-leading-space, 0px);
  content: "";
}

.pnw-head-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.pnw-head-row-toolbar {
  grid-template-columns: 1fr auto auto;
}

.pnw-head-left {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.pnw-head-meta,
.pnw-head-title-row {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.pnw-head-meta {
  justify-content: space-between;
  color: var(
    --pnw-workbench-muted,
    var(--pnw-workbench-default-muted, var(--muted, #64748b))
  );
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.35;
  text-transform: uppercase;
}

.pnw-head-eyebrow,
.pnw-head-summary,
.pnw-head-subtitle {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-page-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pnw-head-subtitle {
  font-size: 0.78rem;
  color: var(
    --pnw-workbench-muted,
    var(--pnw-workbench-default-muted, var(--muted, #64748b))
  );
}

.pnw-head-description {
  max-width: 760px;
  margin: 0;
  color: var(
    --pnw-workbench-muted,
    var(--pnw-workbench-default-muted, var(--muted, #64748b))
  );
  font-size: 0.72rem;
  line-height: 1.4;
}

.pnw-head-actions {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
}

.pnw-head-help {
  display: flex;
  align-items: center;
}

@container pnw-workbench (max-width: 840px) {
  .pnw-head-row:has(.pnw-head-actions) {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: "copy help" "actions actions";
  }

  .pnw-head-row:has(.pnw-head-actions) .pnw-head-left { grid-area: copy; }
  .pnw-head-row:has(.pnw-head-actions) .pnw-head-actions {
    grid-area: actions;
    justify-self: stretch;
  }
  .pnw-head-row:has(.pnw-head-actions) .pnw-head-help { grid-area: help; }
}
</style>
