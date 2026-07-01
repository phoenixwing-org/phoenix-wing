import { ref } from "vue";

export type PnwChoiceDialogOption = {
  id: string;
  label: string;
  variant?: "primary" | "danger" | "default";
  /** 无勾选时禁用（如「纳入所选」） */
  disabled?: boolean;
};

export type PnwChoiceDialogCheckboxItem = {
  id: string;
  label: string;
};

export type PnwChoiceDialogCheckboxes = {
  items: PnwChoiceDialogCheckboxItem[];
  /** 默认勾选 id；缺省为全部 */
  defaultSelectedIds?: string[];
};

export type PnwChoiceDialogRequest = {
  title: string;
  message: string;
  choices: PnwChoiceDialogOption[];
  /** 打开时聚焦的按钮（建议危险操作用 `"cancel"`） */
  defaultChoiceId?: string;
  checkboxes?: PnwChoiceDialogCheckboxes;
};

export type PnwChoiceDialogResult = {
  choiceId: string | null;
  checkedIds: string[];
};

export const pnwChoiceDialogOpen = ref(false);
export const pnwChoiceDialogRequest = ref<PnwChoiceDialogRequest | null>(null);

let pendingResolve: ((value: PnwChoiceDialogResult) => void) | null = null;

/** 单次弹出，多按钮选择；有 checkboxes 时 checkedIds 为当前勾选 id */
export function pnwPromptChoice(req: PnwChoiceDialogRequest): Promise<PnwChoiceDialogResult> {
  if (pendingResolve) {
    pendingResolve({ choiceId: null, checkedIds: [] });
  }
  pnwChoiceDialogRequest.value = req;
  pnwChoiceDialogOpen.value = true;
  return new Promise((resolve) => {
    pendingResolve = resolve;
  });
}

export function pnwResolveChoice(id: string | null, checkedIds: string[] = []) {
  pnwChoiceDialogOpen.value = false;
  pnwChoiceDialogRequest.value = null;
  pendingResolve?.({ choiceId: id, checkedIds });
  pendingResolve = null;
}

/** 简单消息弹窗（替代 ElMessageBox.alert） */
export function pnwAlert(title: string, message: string): Promise<void> {
  return pnwPromptChoice({
    title,
    message,
    choices: [{ id: 'ok', label: '知道了', variant: 'primary' }],
    defaultChoiceId: 'ok',
  }).then(() => undefined)
}

/** 文本输入对话框（替代 ElMessageBox.prompt） */
export function pnwPromptInput(
  title: string,
  message: string,
  opts?: { placeholder?: string; defaultValue?: string },
): Promise<string | null> {
  return pnwPromptChoice({
    title,
    message: `${message}\n\n（输入框待 PnwChoiceDialogHost 支持，当前仅返回确认）`,
    choices: [
      { id: 'confirm', label: '确认', variant: 'primary' },
      { id: 'cancel', label: '取消' },
    ],
  }).then(r => (r.choiceId === 'confirm' ? opts?.defaultValue ?? '' : null))
}
