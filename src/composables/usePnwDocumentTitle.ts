import { toValue, watch, type MaybeRefOrGetter } from "vue";

export const PNW_DEFAULT_APP_TITLE = "Phoenix";

export function usePnwDocumentTitle(options: {
  /** 接受 ref、只读 computed 或 getter；标题同步不会回写 consumer 状态。 */
  workspaceShort: MaybeRefOrGetter<string>;
  workspacePath: MaybeRefOrGetter<string>;
  pageLabel: MaybeRefOrGetter<string | undefined>;
  /** 应用标题，默认 "Phoenix" */
  appTitle?: string;
}) {
  const TITLE = options.appTitle ?? PNW_DEFAULT_APP_TITLE;

  function syncTitle() {
    let title = TITLE;
    const workspacePath = toValue(options.workspacePath);
    if (workspacePath) {
      title = `${TITLE} - ${toValue(options.workspaceShort)}`;
    }
    const page = toValue(options.pageLabel);
    if (page && page !== "欢迎") {
      title = `${title} · ${page}`;
    }
    document.title = title;
  }

  watch(
    () => [
      toValue(options.workspaceShort),
      toValue(options.workspacePath),
      toValue(options.pageLabel),
    ],
    syncTitle,
    { immediate: true },
  );
}
