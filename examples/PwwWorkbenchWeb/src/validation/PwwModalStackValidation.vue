<script setup lang="ts">
import { onBeforeUnmount, ref, nextTick } from "vue";
import { ElDialog } from "element-plus";
import "element-plus/es/components/dialog/style/css.mjs";
import { PnwAppModalOverlay, PnwChoiceDialogHost, pnwGetDocumentModalStack, pnwPromptChoice, type PnwModalLayer } from "phoenix-wing";
const pwwWingOpen = ref(false);
const pwwExternalOpen = ref(false);
const pwwExternalZIndex = ref(5200);
const pwwContent = ref<HTMLElement | null>(null);
const pwwChildContainer = ref<HTMLElement | null>(null);
const pwwResult = ref("尚未确认");
let pwwExternalLayer: PnwModalLayer | undefined;
async function pwwRegisterExternal() {
  await nextTick();
  pwwExternalLayer?.dispose();
  pwwExternalLayer = pnwGetDocumentModalStack(document).register({
    element: () => pwwContent.value,
    childContainer: () => pwwChildContainer.value,
    baseZIndex: pwwExternalZIndex.value,
    onChange: state => { pwwExternalZIndex.value = state.zIndex; },
    onClose: () => { pwwExternalOpen.value = false; },
  });
}
function pwwReleaseExternal() { pwwExternalLayer?.dispose(); pwwExternalLayer = undefined; }
async function pwwAsk(parentLayer?: PnwModalLayer) {
  const result = await pnwPromptChoice({ title: "确认操作", message: "确认应出现在父模态之上。Escape 仅关闭确认并将焦点返回父按钮。",
    parentLayer, choices: [{ id: "confirm", label: "确认" }, { id: "cancel", label: "取消" }], defaultChoiceId: "cancel" });
  pwwResult.value = result.choiceId ?? "关闭确认";
}
onBeforeUnmount(pwwReleaseExternal);
</script>
<template>
  <section class="pww-modal-validation">
    <h2>嵌套模态确认</h2>
    <p>打开父窗，再触发确认。检查层级、Tab、Escape、焦点返回及关闭父窗后取消待决确认。</p>
    <button @click="pwwWingOpen = true">Wing 父模态</button>
    <button @click="pwwExternalOpen = true">第三方父模态</button>
    <p>结果：{{ pwwResult }}</p>
    <a href="/modal-sizing.html">无全局 reset 的窄屏尺寸回归</a>
    <PnwChoiceDialogHost />
    <PnwAppModalOverlay :open="pwwWingOpen" aria-label="Wing 父模态" @close="pwwWingOpen = false">
      <div class="pww-modal-content"><h3>Wing 父模态</h3><button @click="pwwAsk()">弹出确认</button><button @click="pwwWingOpen = false">关闭父窗</button></div>
    </PnwAppModalOverlay>
    <ElDialog v-model="pwwExternalOpen" title="第三方父模态" append-to-body :z-index="pwwExternalZIndex" :close-on-press-escape="false" @opened="pwwRegisterExternal" @close="pwwReleaseExternal">
      <div ref="pwwContent" tabindex="-1"><button @click="pwwAsk(pwwExternalLayer)">弹出确认</button><button @click="pwwExternalOpen = false">关闭父窗</button><div ref="pwwChildContainer" /></div>
    </ElDialog>
  </section>
</template>
<style scoped>
.pww-modal-validation { padding: 20px; }
.pww-modal-validation button { margin: 8px; }
.pww-modal-content { padding: 20px; }
</style>
