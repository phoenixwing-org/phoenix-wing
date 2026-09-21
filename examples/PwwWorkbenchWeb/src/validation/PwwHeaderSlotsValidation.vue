<script setup lang="ts">
import { ref } from "vue";
import { PnwPageHeader, PnwViewPresentationPortal, pnwCreateViewPresentationRecord } from "phoenix-wing";
const pwwCenter = ref(true), pwwRight = ref(true), pwwLegacy = ref(false), pwwNarrow = ref(false);
const pwwSearch = ref(""), pwwSaved = ref(0);
const pwwTitle = ref("测量报告");
const pwwActionsEnd = ref(false);
const pwwRecord = ref(pnwCreateViewPresentationRecord({rendererId:"header-slots",viewInstanceId:"header-slots:1",ownerTabId:"header-slots",instanceKey:"header-slots:1"}));
</script>

<template>
  <div class="pww-header-validation">
    <form class="pww-header-options" @submit.prevent>
      <label><input v-model="pwwCenter" type="checkbox">center</label>
      <label><input v-model="pwwRight" type="checkbox">right</label>
      <label><input v-model="pwwLegacy" type="checkbox">旧 actions / help</label>
      <label><input v-model="pwwNarrow" type="checkbox">窄容器</label>
      <label><input v-model="pwwActionsEnd" type="checkbox">旧操作靠右</label>
      <label>标题 <input v-model="pwwTitle" aria-label="示例标题"></label>
      <button type="button" @click="pwwTitle='测量报告 · 多实例与长标题布局验证 · 保留右侧业务和框架操作'">长标题</button>
      <button type="button" @click="pwwTitle='测量报告'">短标题</button>
    </form>
    <div class="pww-header-stage" :class="{'pww-header-stage--narrow':pwwNarrow}">
      <PnwViewPresentationPortal v-model:record="pwwRecord" title="Header 插槽验证" content-layout="page">
        <template #header="{mode,detach,reattach}">
          <PnwPageHeader :title="pwwTitle" :actions-align="pwwActionsEnd ? 'end' : 'center'" :presentation-detachable="true" :presentation-mode="mode" @detach-view="detach" @reattach-view="reattach">
            <template v-if="pwwCenter" #center><input v-model="pwwSearch" type="search" placeholder="搜索测点" aria-label="搜索测点"></template>
            <template v-if="pwwRight" #right>
              <button type="button" title="保存" aria-label="保存" @click="pwwSaved++">保存</button>
              <button type="button" title="清空搜索" aria-label="清空搜索" @click="pwwSearch=''">清空</button>
            </template>
            <template v-if="pwwLegacy" #actions><button type="button" @click="pwwSaved++">旧操作</button></template>
            <template v-if="pwwLegacy" #help><span>旧 help</span></template>
          </PnwPageHeader>
        </template>
        <template #main>
          <section class="pww-header-results"><output>保存次数：{{ pwwSaved }} · 查询：{{ pwwSearch || '全部' }}</output>
            <ul><li v-for="index in 40" :key="index">测点 {{ index }}</li></ul>
          </section>
        </template>
      </PnwViewPresentationPortal>
    </div>
  </div>
</template>

<style scoped>
.pww-header-validation{height:100%;display:flex;flex-direction:column;gap:12px;padding:12px;min-height:0;overflow:auto}
.pww-header-options{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.pww-header-options label{display:inline-flex;align-items:center;gap:6px}
.pww-header-stage{flex:1;min-height:240px;width:100%;border:1px solid var(--pnw-workbench-border,#dce3ed)}
.pww-header-stage--narrow{width:380px;max-width:100%}
.pww-header-results{padding:12px}.pww-header-results li{padding:8px}
input[type=search]{width:180px;max-width:100%;min-width:0}
button{min-height:28px;cursor:pointer}
</style>
