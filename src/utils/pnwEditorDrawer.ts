import type {
  PnwEditorDrawerCloseContext,
  PnwEditorDrawerCloseGuard,
} from "../types/PnwEditorDrawer.js";

export async function pnwCanCloseEditorDrawer(
  context: PnwEditorDrawerCloseContext,
  guard?: PnwEditorDrawerCloseGuard,
): Promise<boolean> {
  if (!context.dirty || !guard) return true;
  return guard(context);
}
