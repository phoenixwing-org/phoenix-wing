<script setup lang="ts">
import { PnwIcon, PnwWorkbenchHome } from "phoenix-wing";
import type { PwwFixtureViewDefinition } from "./PwwFixtureViewDefinitions.js";

defineProps<{ view: PwwFixtureViewDefinition }>();

const pwwHomeFeatures = [
  { id: "dashboard", icon: "dashboard", title: "综合看板", description: "查看工程摘要与运行状态。" },
  { id: "models", icon: "list", title: "模型目录", description: "浏览模型结构与属性。" },
  { id: "tour", icon: "search", title: "界面巡游", description: "了解 Ribbon、View Tab 与面板。" },
] as const;
</script>

<template>
  <PnwWorkbenchHome
    :title="view.title"
    :eyebrow="view.eyebrow"
    :description="view.description"
  >
    <template #actions>
      <button class="pww-home-action" type="button">开始巡游</button>
    </template>

    <section class="pww-home-feature-grid" aria-label="快速开始">
      <button
        v-for="feature in pwwHomeFeatures"
        :key="feature.id"
        type="button"
        class="pww-home-feature"
      >
        <span class="pww-home-feature-icon" aria-hidden="true">
          <PnwIcon :name="feature.icon" :size="20" />
        </span>
        <span class="pww-home-feature-copy">
          <strong>{{ feature.title }}</strong>
          <span>{{ feature.description }}</span>
        </span>
      </button>
    </section>

    <section class="pww-home-custom-block">
      <strong>消费者完全自定义区</strong>
      <p>可以替换成卡片、表格、画布或空态；Wing 不拥有业务数据和命令。</p>
    </section>

    <template #footer>
      使用提示：点击顶部品牌返回全屏 Welcome；Home 本身仍是普通 View。
    </template>
  </PnwWorkbenchHome>
</template>

<style scoped>
.pww-home-action,
.pww-home-feature {
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  background: var(--pnw-workbench-surface, #fff);
  color: var(--pnw-workbench-text, #0f172a);
  font: inherit;
  cursor: pointer;
}

.pww-home-action {
  min-height: 32px;
  padding: 5px 12px;
  border-radius: 6px;
}

.pww-home-feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.pww-home-feature {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  text-align: left;
}

.pww-home-feature:hover,
.pww-home-action:hover {
  border-color: var(--pnw-control-active-text, #2563eb);
  background: var(--pnw-control-hover-bg, rgb(59 130 246 / 9%));
}

.pww-home-feature-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 7px;
  color: var(--pnw-control-active-text, #2563eb);
  background: var(--pnw-control-active-bg, rgb(37 99 235 / 10%));
}

.pww-home-feature-copy {
  display: grid;
  gap: 3px;
}

.pww-home-feature-copy span,
.pww-home-custom-block p {
  margin: 0;
  color: var(--pnw-workbench-muted, #64748b);
  font-size: 0.82rem;
  line-height: 1.5;
}

.pww-home-custom-block {
  padding: 16px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 8px;
  background: var(--pnw-workbench-bg, #f8fafc);
}
</style>
