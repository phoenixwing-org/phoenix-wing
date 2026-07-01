export type PnwColorScheme = "light" | "dark" | "system";

export function pnwResolveColorScheme(scheme: PnwColorScheme): "light" | "dark" {
  if (scheme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return scheme;
}

export function pnwApplyColorScheme(scheme: PnwColorScheme): "light" | "dark" {
  const resolved = pnwResolveColorScheme(scheme);
  document.documentElement.dataset.theme = resolved;
  return resolved;
}
