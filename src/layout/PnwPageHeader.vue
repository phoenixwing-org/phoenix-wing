<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  /** 默认 true：三栏网格（标题 · 居中工具条 · 帮助区） */
  toolbar?: boolean;
}>();
</script>

<template>
  <header class="pnw-page-head">
    <div class="pnw-head-row" :class="{ 'pnw-head-row-toolbar': toolbar !== false }">
      <div class="pnw-head-left">
        <h1 class="pnw-page-title">{{ title }}</h1>
        <span v-if="subtitle" class="pnw-head-subtitle">{{ subtitle }}</span>
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
  padding: 8px 12px;
  border-bottom: 1px solid var(--border, #e2e8f0);
  background: var(--page-bg, #fff);
  flex-shrink: 0;
  min-height: 44px;
  box-sizing: border-box;
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
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.pnw-page-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pnw-head-subtitle {
  font-size: 0.78rem;
  color: var(--muted, #64748b);
  white-space: nowrap;
}

.pnw-head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pnw-head-help {
  display: flex;
  align-items: center;
}
</style>
