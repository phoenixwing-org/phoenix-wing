export type PnwEditorDrawerMode = "view" | "create" | "edit";

export type PnwEditorDrawerSide = "left" | "right";

export interface PnwEditorDrawerIdentity {
  editorId?: string;
  pageId?: string;
  tabId?: string;
  resourceKey?: string | number;
}

export interface PnwEditorDrawerCloseContext extends PnwEditorDrawerIdentity {
  mode: PnwEditorDrawerMode;
  dirty: boolean;
}

export type PnwEditorDrawerCloseGuard = (
  context: PnwEditorDrawerCloseContext,
) => boolean | Promise<boolean>;
