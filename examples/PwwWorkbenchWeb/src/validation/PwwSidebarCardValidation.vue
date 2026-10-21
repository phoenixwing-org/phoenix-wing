<script setup lang="ts">
import { ref } from "vue";
import { PnwSidebarBlock } from "phoenix-wing";
const pwwNarrow = ref(false);
const pwwActions = ref(0);
</script>

<template>
  <main class="pww-card-validation">
    <label><input v-model="pwwNarrow" type="checkbox" />窄容器（240px）</label>
    <p>点击标题展开/折叠；actions 不折叠区块。操作次数：{{ pwwActions }}</p>
    <div class="pww-card-stack" :class="{ 'pww-card-stack--narrow': pwwNarrow }">
      <PnwSidebarBlock title="属性卡片" variant="card">
        <template #actions>
          <button v-for="label in ['刷新数据', '保存修改', '恢复默认']" :key="label" @click="pwwActions++">{{ label }}</button>
        </template>
        <dl><dt>名称</dt><dd>示例对象</dd><dt>状态</dt><dd>就绪</dd></dl>
      </PnwSidebarBlock>
      <PnwSidebarBlock title="初始折叠卡片" variant="card" :expanded="false"><p>展开后仅有一条标题分隔线。</p></PnwSidebarBlock>
      <PnwSidebarBlock title="路径选择卡片" variant="card">
        <template #actions><div class="pww-card-toolbar"><select aria-label="示例路径"><option>/workspace/samples/long-example-directory/sample-data.json</option></select><button @click="pwwActions++">刷新路径</button><button @click="pwwActions++">临时打开</button></div></template>
        <p>长选项与业务按钮在卡片内换行。</p>
      </PnwSidebarBlock>
      <PnwSidebarBlock title="不可折叠卡片" variant="card" :collapsible="false"><p>标题区域与卡片外框由组件提供。</p></PnwSidebarBlock>
      <PnwSidebarBlock title="表格内容" variant="card">
        <table><thead><tr><th>名称</th><th>数值</th></tr></thead><tbody><tr><td>样本 A</td><td>24</td></tr><tr><td>样本 B</td><td>48</td></tr></tbody></table>
      </PnwSidebarBlock>
      <PnwSidebarBlock title="图表内容" variant="card">
        <svg viewBox="0 0 200 80" role="img" aria-label="示例柱状图"><path d="M10 5V70H190" fill="none" stroke="currentColor" /><path d="M35 70V46H65V70 M95 70V22H125V70" fill="currentColor" /></svg>
      </PnwSidebarBlock>
    </div>
  </main>
</template>

<style scoped>
.pww-card-validation { height: 100%; overflow: auto; padding: 16px; }
.pww-card-stack { display: flex; flex-direction: column; gap: 12px; width: min(640px, 100%); }
.pww-card-stack--narrow { width: min(240px, 100%); }
.pww-card-stack > * { height: auto; flex: none; }
dl, p { margin: 0; }
table { width: 100%; text-align: left; }
svg { width: 100%; max-height: 120px; }
dd { margin: 4px 0 12px; }
button { font: inherit; }
.pww-card-toolbar { display: flex; flex-wrap: wrap; min-width: 0; max-width: 100%; gap: 4px; }
.pww-card-toolbar select { width: 320px; max-width: 100%; min-width: 0; flex: 1 1 220px; }
</style>
