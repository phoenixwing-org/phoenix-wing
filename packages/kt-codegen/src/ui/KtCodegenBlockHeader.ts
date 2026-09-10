// SPDX-License-Identifier: Apache-2.0

/** Shared opt-in Block header baseline; no Host state or body scroll ownership. */
export const KT_CODEGEN_BLOCK_HEADER_STYLE = `
:host([collapsible]) { border-radius: 4px; }
:host([collapsible]) [data-codegen-block-header] {
  display: flex; flex-wrap: nowrap; align-items: center; gap: 5px;
  min-width: 0; min-height: 34px; padding: 3px 7px;
  color: var(--vscode-foreground, var(--text, inherit));
  background: var(--vscode-sideBarSectionHeader-background, var(--panel-head-bg, #f6f6f6));
  border-radius: 3px 3px 0 0;
  font: var(--vscode-font-size, 13px)/1.35 var(--vscode-font-family, system-ui, sans-serif);
  font-weight: 600; cursor: pointer; overflow-x: auto; scrollbar-width: thin;
}
:host([collapsible][collapsed]) [data-codegen-block-header] { border-bottom: 0; border-radius: 3px; }
:host([collapsible]) [data-codegen-block-toggle] {
  display: flex; flex: 1 0 max-content; align-self: stretch; align-items: center;
  gap: 5px; min-width: max-content; min-height: 26px; margin-right: auto;
  padding: 0; color: inherit; background: transparent; border: 0; border-radius: 2px;
  font: inherit; font-weight: 600; text-align: left; cursor: pointer;
}
:host([collapsible]) [data-codegen-block-toggle]:hover { background: transparent; }
:host([collapsible]) [data-codegen-block-toggle]:focus-visible {
  outline: 1px solid var(--vscode-focusBorder, var(--accent, #007acc)); outline-offset: -1px;
}
:host([collapsible]) [data-codegen-block-indicator] {
  display: inline-block; flex: 0 0 14px; width: 14px; height: 18px;
  color: var(--vscode-descriptionForeground, var(--muted, #666));
  font: 18px/1 var(--vscode-font-family, system-ui, sans-serif); text-align: center;
  transform: rotate(0deg);
}
:host([collapsible]) [data-codegen-block-toggle][aria-expanded="true"] [data-codegen-block-indicator] { transform: rotate(90deg); }
:host([collapsible]) [data-codegen-block-title] { flex: 0 0 auto; color: inherit; font-weight: 600; }
:host([collapsible]) [data-codegen-block-actions] {
  display: flex; flex: 0 0 auto; align-items: center; gap: 6px;
  font-size: inherit; font-weight: 400; white-space: nowrap; cursor: default;
}
:host([collapsible]) [data-codegen-block-actions] > button,
:host([collapsible]) [data-codegen-block-header] > button:not([data-codegen-block-toggle]) {
  min-height: 26px; padding: 2px 8px; border-radius: 4px; font-weight: 400;
}
`;
