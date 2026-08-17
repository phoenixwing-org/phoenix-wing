<script setup lang="ts">
withDefaults(defineProps<{
  title?: string;
  eyebrow?: string;
  description?: string;
  maxContentWidth?: string;
}>(), {
  title: "Home",
  eyebrow: "",
  description: "",
  maxContentWidth: "1080px",
});
</script>

<template>
  <section
    class="pnw-workbench-home"
    data-pnw-workbench-home
    :style="{ '--pnw-workbench-home-max-width': maxContentWidth }"
  >
    <div class="pnw-workbench-home-content">
      <header class="pnw-workbench-home-header">
        <div class="pnw-workbench-home-copy">
          <span v-if="eyebrow" class="pnw-workbench-home-eyebrow">{{ eyebrow }}</span>
          <h1 class="pnw-workbench-home-title">
            <slot name="title">{{ title }}</slot>
          </h1>
          <slot name="description">
            <p v-if="description" class="pnw-workbench-home-description">{{ description }}</p>
          </slot>
        </div>
        <div v-if="$slots.actions" class="pnw-workbench-home-actions">
          <slot name="actions" />
        </div>
      </header>

      <div class="pnw-workbench-home-main">
        <slot />
      </div>

      <footer v-if="$slots.footer" class="pnw-workbench-home-footer">
        <slot name="footer" />
      </footer>
    </div>
  </section>
</template>

<style scoped>
.pnw-workbench-home {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  background: var(
    --pnw-workbench-home-bg,
    var(--pnw-editor-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)))
  );
  box-sizing: border-box;
}

.pnw-workbench-home-content {
  width: min(100%, var(--pnw-workbench-home-max-width, 1080px));
  min-width: 0;
  padding: var(--pnw-workbench-home-padding, 24px 28px 40px);
  box-sizing: border-box;
}

.pnw-workbench-home-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: var(--pnw-workbench-home-header-gap, 22px);
}

.pnw-workbench-home-copy {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.pnw-workbench-home-eyebrow {
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pnw-workbench-home-title {
  margin: 0;
  color: inherit;
  font-size: clamp(1.35rem, 2.4vw, 2rem);
  line-height: 1.2;
}

.pnw-workbench-home-description {
  max-width: 760px;
  margin: 0;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 0.9rem;
  line-height: 1.65;
}

.pnw-workbench-home-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex: none;
}

.pnw-workbench-home-main {
  display: grid;
  gap: var(--pnw-workbench-home-content-gap, 16px);
  min-width: 0;
}

.pnw-workbench-home-footer {
  margin-top: var(--pnw-workbench-home-footer-gap, 28px);
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
}

@media (max-width: 640px) {
  .pnw-workbench-home-content {
    padding: var(--pnw-workbench-home-padding-narrow, 18px 16px 32px);
  }

  .pnw-workbench-home-header {
    align-items: stretch;
    flex-direction: column;
    margin-bottom: 18px;
  }

  .pnw-workbench-home-actions {
    justify-content: flex-start;
  }
}
</style>
