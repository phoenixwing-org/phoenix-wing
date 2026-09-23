<script setup lang="ts">
import { ref } from "vue";
import { PnwPhoenixWingMark, PnwRibbonToolButton, PnwSelect, PnwSidebarBlock, type PnwColorScheme } from "phoenix-wing";

defineProps<{ colorScheme?: PnwColorScheme }>();

const pwwVariant = ref<"strip" | "card">("card");
const pwwDraft = ref("切换样式、折叠再展开，内容仍保留");
const pwwRefreshCount = ref(0);
const pwwOptions = [{ value: "card", label: "Main · 圆角外框" }, { value: "strip", label: "Primary · 横线" }];
</script>

<template>
  <div class="pww-block-validation">
    <div class="pww-block-options">
      <label for="pww-block-variant">Block 样式</label>
      <PnwSelect id="pww-block-variant" :model-value="pwwVariant" :options="pwwOptions" :color-scheme="colorScheme" aria-label="Block 样式"
        @update:model-value="pwwVariant = $event === 'strip' ? 'strip' : 'card'" />
      <span>复用 variant；Header 操作插槽无竖线。只切换外观，不重建内容。</span>
    </div>
    <div class="pww-block-comparison">
      <div class="pww-block-main">
        <PnwSidebarBlock title="Main · 正文 Block" :variant="pwwVariant" data-pww-main-block>
          <template #suffix>已就绪</template>
          <template #actions><PnwRibbonToolButton label="刷新 Block" icon="pnw:refresh" display-mode="icon-title" :show-title="true" @click="pwwRefreshCount++" /></template>
          <label class="pww-block-field">草稿 <input v-model="pwwDraft" aria-label="Block 草稿" /></label>
          <output aria-live="polite">刷新次数：{{ pwwRefreshCount }}</output>
        </PnwSidebarBlock>
        <PnwSidebarBlock title="Main · 图片与属性" variant="card" :collapsible="false" class="pww-picture-block" data-pww-nested-block>
            <div class="pww-picture-layout">
              <figure class="pww-picture" aria-label="图片预览">
                <PnwPhoenixWingMark title="Wing 示例图片" />
                <figcaption>PIC · SVG 预览</figcaption>
              </figure>
              <div class="pww-picture-details">
                <PnwSidebarBlock title="图片信息" data-pww-inner-strip>
                  <dl><dt>格式</dt><dd>SVG</dd><dt>尺寸</dt><dd>128 × 128</dd></dl>
                </PnwSidebarBlock>
                <PnwSidebarBlock title="显示参数" data-pww-inner-strip>
                  <dl><dt>缩放</dt><dd>自适应</dd><dt>来源</dt><dd>Wing 公共资源</dd></dl>
                </PnwSidebarBlock>
              </div>
            </div>
        </PnwSidebarBlock>
        <PnwSidebarBlock title="Main · 不可折叠 Block" variant="card" :collapsible="false" data-pww-static-block>
          <p>固定内容也使用实线圆角外框；不需要消费者补边框 CSS。</p>
        </PnwSidebarBlock>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pww-block-validation { padding:10px; min-width:0; overflow:auto; }
.pww-block-options { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:10px; font-size:13px; }
.pww-block-options > span { color:var(--pnw-workbench-default-muted); }
.pww-block-comparison, .pww-block-main { min-width:0; }
.pww-block-main { display:flex; flex-direction:column; gap:10px; }
.pww-block-field { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.pww-block-field input { flex:1; min-width:0; padding:5px 8px; color:inherit; background:var(--pnw-workbench-default-bg); border:1px solid var(--pnw-workbench-default-border); font:inherit; }
.pww-picture-block { container-type:inline-size; }
.pww-picture-layout { display:grid; grid-template-columns:minmax(0, 1fr) minmax(0, 1fr); gap:12px; min-width:0; }
.pww-picture { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; min-width:0; margin:0; padding:12px; background:var(--pnw-workbench-default-bg); }
.pww-picture .pnw-phoenix-wing-mark { --pnw-phoenix-wing-mark-size:100px; }
.pww-picture figcaption { color:var(--pnw-workbench-default-muted); font-size:12px; }
.pww-picture-details { display:flex; flex-direction:column; gap:0; min-width:0; }
.pww-picture-details dl { display:grid; grid-template-columns:auto minmax(0, 1fr); gap:6px 12px; margin:0; font-size:13px; }
.pww-picture-details dd { margin:0; overflow-wrap:anywhere; }
@container (max-width: 480px) { .pww-picture-layout { grid-template-columns:minmax(0, 1fr); } }
</style>
