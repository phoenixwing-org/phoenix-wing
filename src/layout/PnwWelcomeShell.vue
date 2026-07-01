<script setup lang="ts">
defineProps<{
  /** 应用标题 */
  appTitle?: string;
}>();
</script>

<template>
  <div class="pnw-welcome">
    <!-- 左侧品牌栏 -->
    <aside class="pnw-welcome-rail">
      <div class="pnw-welcome-brand">
        <slot name="brand">
          <span class="pnw-welcome-brand-text">{{ appTitle ?? '' }}</span>
        </slot>
      </div>
      <div class="pnw-welcome-actions">
        <slot name="actions" />
      </div>
      <div class="pnw-welcome-links">
        <slot name="links" />
      </div>
    </aside>

    <!-- 右侧主区域 -->
    <main class="pnw-welcome-main">
      <div class="pnw-welcome-head">
        <h1 class="pnw-welcome-title">
          <slot name="title">{{ appTitle ?? '欢迎' }}</slot>
        </h1>
        <div class="pnw-welcome-head-actions">
          <slot name="headActions" />
        </div>
      </div>

      <section class="pnw-welcome-section">
        <slot name="main">
          <p class="pnw-welcome-empty">暂无内容</p>
        </slot>
      </section>
    </main>
  </div>
</template>

<style scoped>
.pnw-welcome {
  display: flex;
  height: 100%;
  min-height: 0;
}

.pnw-welcome-rail {
  flex-shrink: 0;
  width: 240px;
  display: flex;
  flex-direction: column;
  padding: 32px 24px;
  background: var(--phoenix-bg-welcome-rail, #f0f4f8);
  border-right: 1px solid var(--border, #e2e8f0);
}

.pnw-welcome-brand {
  flex-shrink: 0;
  margin-bottom: 32px;
}

.pnw-welcome-brand-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text, #0f172a);
}

.pnw-welcome-actions {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pnw-welcome-links {
  flex-shrink: 0;
  margin-top: 16px;
  font-size: 0.75rem;
  color: var(--muted, #64748b);
}

.pnw-welcome-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 24px 32px;
  overflow: auto;
  background: var(--page-bg, #fff);
}

.pnw-welcome-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.pnw-welcome-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text, #0f172a);
}

.pnw-welcome-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pnw-welcome-section {
  flex: 1;
  min-height: 0;
}

.pnw-welcome-empty {
  color: var(--muted, #64748b);
  font-size: 0.9rem;
}
</style>
