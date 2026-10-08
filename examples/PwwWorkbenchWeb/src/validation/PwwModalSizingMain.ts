import { createApp, defineComponent, h, ref } from "vue";
import { PnwAppModalOverlay, PnwChoiceDialogHost, pnwPromptChoice } from "phoenix-wing";
import "phoenix-wing/style.css";
// Intentionally no global box-sizing reset: public modal styles own their box model.
const PwwModalSizingFixture = defineComponent({ setup() {
  const open = ref(false);
  return () => h("main", [
    h("h1", "无全局 reset 的模态尺寸回归"),
    h("button", { onClick: () => { open.value = true; } }, "打开普通模态"),
    h("button", { onClick: () => { void pnwPromptChoice({ title: "确认", message: "390px 窄屏下，遮罩、面板和按钮应保持在可用宽度内。", choices: [{ id: "confirm", label: "确认" }, { id: "cancel", label: "取消" }], defaultChoiceId: "cancel" }); } }, "打开确认"),
    h(PnwChoiceDialogHost),
    h(PnwAppModalOverlay, { open: open.value, ariaLabel: "普通模态", onClose: () => { open.value = false; } }, { default: () => h("button", { onClick: () => { open.value = false; } }, "关闭") }),
  ]);
} });
createApp(PwwModalSizingFixture).mount("#app");
