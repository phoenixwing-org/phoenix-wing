<script setup lang="ts">
withDefaults(defineProps<{
  /** 应用标题 */
  appTitle?: string;
  /** 隐藏左侧 Rail 后，右侧内容自动占满 Welcome 外壳。 */
  showRail?: boolean;
}>(), {
  appTitle: "",
  showRail: true,
});
</script>

<template>
  <div class="pnw-welcome" :class="{ 'pnw-welcome--without-rail': !showRail }">
    <!-- 左侧品牌栏 -->
    <aside v-if="showRail" class="pnw-welcome-rail">
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
  display: grid;
  grid-template-columns: var(--pnw-welcome-rail-width, minmax(240px, 360px)) minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, var(--text, #0f172a)));
  background: var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, var(--page-bg, #fff)));
}

.pnw-welcome--without-rail {
  grid-template-columns: minmax(0, 1fr);
}

.pnw-welcome-rail {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: var(--pnw-welcome-rail-padding, 36px 28px);
  background: var(
    --pnw-welcome-rail-bg,
    var(--pnw-workbench-bg, var(--pnw-workbench-default-bg, var(--phoenix-bg-welcome-rail, #f1f5f9)))
  );
  border-right: 1px solid var(
    --pnw-workbench-border,
    var(--pnw-workbench-default-border, var(--border, #dbe3ed))
  );
}

.pnw-welcome-brand {
  flex-shrink: 0;
  margin-bottom: 32px;
}

.pnw-welcome-brand-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: inherit;
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
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, var(--muted, #64748b)));
}

.pnw-welcome-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: var(--pnw-welcome-main-padding, 40px 48px);
  overflow: auto;
  background: var(--pnw-welcome-main-bg, transparent);
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
  color: inherit;
}

.pnw-welcome-head-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.pnw-welcome-section {
  flex: 1;
  min-height: 0;
}

.pnw-welcome-empty {
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, var(--muted, #64748b)));
  font-size: 0.9rem;
}

@media (max-width: 760px) {
  .pnw-welcome {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
    min-height: 100%;
  }

  .pnw-welcome-rail {
    padding: var(--pnw-welcome-rail-padding-narrow, 20px);
    border-right: 0;
    border-bottom: 1px solid var(
      --pnw-workbench-border,
      var(--pnw-workbench-default-border, var(--border, #dbe3ed))
    );
  }

  .pnw-welcome-brand {
    margin-bottom: 16px;
  }

  .pnw-welcome-actions {
    flex: none;
  }

  .pnw-welcome-main {
    padding: var(--pnw-welcome-main-padding-narrow, 24px 20px);
    overflow: visible;
  }

  .pnw-welcome-head {
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 20px;
  }
}
</style>
