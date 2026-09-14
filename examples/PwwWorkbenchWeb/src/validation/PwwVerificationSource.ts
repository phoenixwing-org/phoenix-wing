export type PwwVerificationSource = {
  readonly version: string;
  readonly checkedAt: string;
} & (
  | { readonly mode: "development"; readonly commit: string; readonly branch: string; readonly dirty: boolean }
  | { readonly mode: "registry" }
);
