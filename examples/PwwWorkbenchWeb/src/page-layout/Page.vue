<script setup lang="ts">
import { ref } from 'vue';
import { PnwWorkbenchLayout, PnwPrimaryPanel, PnwPageHeader, PnwViewPresentationPortal, pnwCreateViewPresentationRecord } from 'phoenix-wing';
import 'phoenix-wing/style.css';
const record = ref(pnwCreateViewPresentationRecord({ rendererId: 'page-fixture', viewInstanceId: 'page-fixture', ownerTabId: 'page-fixture', instanceKey: 'default' }));
const value = ref('retained');
</script>
<template>
  <PnwWorkbenchLayout :contributions="{ primary: true }" :visibility="{ primary: true, bottom: false, secondary: false }" :show-footer="false">
    <template #primary><PnwPrimaryPanel title="Properties"><p>Page fixture</p></PnwPrimaryPanel></template>
    <PnwViewPresentationPortal v-model:record="record" title="Fixed Header" content-layout="page">
      <template #header="{ mode, detach, reattach }"><PnwPageHeader title="Fixed Header" :presentation-detachable="true" :presentation-mode="mode" @detach-view="detach" @reattach-view="reattach" /></template>
      <template #main><div class="content"><label>Retained value <input v-model="value" aria-label="Retained value"></label><p v-for="n in 80" :key="n">Row {{ n }}</p><button>End of content</button></div></template>
    </PnwViewPresentationPortal>
  </PnwWorkbenchLayout>
</template>
<style>
html,body,#app{height:100%;margin:0;overflow:hidden}
.content{padding:16px}
</style>
