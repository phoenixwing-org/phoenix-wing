import { watch, type Ref } from "vue";

export const PNW_DEFAULT_APP_TITLE = "Phoenix";

export function usePnwDocumentTitle(options: {
  workspaceShort: Ref<string>;
  workspacePath: Ref<string>;
  pageLabel: Ref<string | undefined>;
  /** 应用标题，默认 "Phoenix" */
  appTitle?: string;
}) {
  const TITLE = options.appTitle ?? PNW_DEFAULT_APP_TITLE;

  function syncTitle() {
    let title = TITLE;
    if (options.workspacePath.value) {
      title = `${TITLE} - ${options.workspaceShort.value}`;
    }
    const page = options.pageLabel.value;
    if (page && page !== "欢迎") {
      title = `${title} · ${page}`;
    }
    document.title = title;
  }

  watch(
    [options.workspaceShort, options.workspacePath, options.pageLabel],
    syncTitle,
    { immediate: true },
  );
}
