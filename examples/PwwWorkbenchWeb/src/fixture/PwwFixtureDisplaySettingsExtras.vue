<script setup lang="ts">
import {
  PnwIcon,
  PNW_ICON_TEST_SIZES,
  type PnwColorScheme,
} from "phoenix-wing";

defineProps<{ colorScheme: PnwColorScheme }>();

const pwwNarrowPreview = defineModel<boolean>("narrowPreview", { required: true });
const pwwCustomTheme = defineModel<boolean>("customTheme", { required: true });
</script>

<template>
  <div class="pww-display-settings-extras">
    <details class="pww-display-settings-extra" open>
      <summary>
        <h3>Fixture 窄屏检查</h3>
        <span>consumer 自定义界面</span>
      </summary>
      <div class="pww-display-settings-extra-body">
        <label>
          <input v-model="pwwNarrowPreview" type="checkbox">
          700px 窄屏预览
        </label>
      </div>
    </details>

    <details class="pww-display-settings-extra">
      <summary>
        <h3>Fixture 主题扩展</h3>
        <span>基础主题：{{ colorScheme }}</span>
      </summary>
      <div class="pww-display-settings-extra-body">
        <label>
          <input v-model="pwwCustomTheme" type="checkbox">
          使用示例贡献的橙色 CSS token
        </label>
      </div>
    </details>

    <details class="pww-display-settings-extra">
      <summary>
        <h3>公共 SVG 尺寸回归</h3>
        <span>同一 PnwIcon 矢量真源</span>
      </summary>
      <div class="pww-display-settings-extra-body">
        <div class="pww-display-settings-icon-sizes" aria-label="公共图标尺寸回归">
          <span v-for="size in PNW_ICON_TEST_SIZES" :key="size">
            <PnwIcon name="settings" :size="size" />
            <small>{{ size }}px</small>
          </span>
        </div>
      </div>
    </details>
  </div>
</template>

<style scoped>
.pww-display-settings-extras {
  display: grid;
  gap: 6px;
}

.pww-display-settings-extra {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--pnw-workbench-border);
  border-radius: 7px;
  background: color-mix(in srgb, var(--pnw-workbench-surface) 88%, var(--pnw-workbench-bg) 12%);
}

.pww-display-settings-extra summary {
  min-height: 34px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 10px;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  cursor: pointer;
  list-style: none;
}

.pww-display-settings-extra summary::-webkit-details-marker {
  display: none;
}

.pww-display-settings-extra summary::after {
  color: var(--pnw-workbench-muted);
  content: "›";
  font-size: 16px;
  transition: transform 120ms ease;
}

.pww-display-settings-extra[open] > summary::after {
  transform: rotate(90deg);
}

.pww-display-settings-extra summary:hover,
.pww-display-settings-extra summary:focus-visible {
  outline: 0;
  background: var(--pnw-control-hover-bg);
}

.pww-display-settings-extra h3 {
  margin: 0;
  font-size: 13px;
}

.pww-display-settings-extra summary span {
  overflow: hidden;
  color: var(--pnw-workbench-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pww-display-settings-extra-body {
  display: grid;
  gap: 8px;
  padding: 0 9px 9px;
}

.pww-display-settings-extra-body label {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--pnw-workbench-muted);
  cursor: pointer;
  font-size: 11px;
}

.pww-display-settings-extra-body input {
  accent-color: var(--pnw-control-active-text);
}

.pww-display-settings-icon-sizes {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 18px;
}

.pww-display-settings-icon-sizes > span {
  display: grid;
  justify-items: center;
  gap: 4px;
  color: var(--pnw-workbench-muted);
}
</style>
