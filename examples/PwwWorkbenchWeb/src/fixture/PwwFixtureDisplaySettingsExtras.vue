<script setup lang="ts">
import {
  PnwIcon,
  PnwWorkbenchDisplaySettingsSection,
  PNW_ICON_TEST_SIZES,
  type PnwColorScheme,
} from "phoenix-wing";

defineProps<{ colorScheme: PnwColorScheme }>();

const pwwNarrowPreview = defineModel<boolean>("narrowPreview", { required: true });
const pwwCustomTheme = defineModel<boolean>("customTheme", { required: true });
</script>

<template>
  <div class="pww-display-settings-extras">
    <PnwWorkbenchDisplaySettingsSection
      title="Fixture 窄屏检查"
      summary="consumer 自定义界面"
      default-open
    >
      <label>
        <input v-model="pwwNarrowPreview" type="checkbox">
        700px 窄屏预览
      </label>
    </PnwWorkbenchDisplaySettingsSection>

    <PnwWorkbenchDisplaySettingsSection
      title="Fixture 主题扩展"
      :summary="`基础主题：${colorScheme}`"
    >
      <label>
        <input v-model="pwwCustomTheme" type="checkbox">
        使用示例贡献的橙色 CSS token
      </label>
    </PnwWorkbenchDisplaySettingsSection>

    <PnwWorkbenchDisplaySettingsSection
      title="公共 SVG 尺寸回归"
      summary="同一 PnwIcon 矢量真源"
    >
      <div class="pww-display-settings-icon-sizes" aria-label="公共图标尺寸回归">
        <span v-for="size in PNW_ICON_TEST_SIZES" :key="size">
          <PnwIcon name="settings" :size="size" />
          <small>{{ size }}px</small>
        </span>
      </div>
    </PnwWorkbenchDisplaySettingsSection>
  </div>
</template>

<style scoped>
.pww-display-settings-extras {
  display: grid;
  gap: 6px;
}

.pww-display-settings-extras label {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--pnw-workbench-muted);
  cursor: pointer;
  font-size: 11px;
}

.pww-display-settings-extras input {
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
