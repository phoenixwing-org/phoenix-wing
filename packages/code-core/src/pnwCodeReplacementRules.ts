// SPDX-License-Identifier: Apache-2.0

export interface PnwCodeReplacementRule {
  readonly id?: string;
  readonly search: string;
  readonly replace: string;
  readonly enabled?: boolean;
}
export interface PnwCodeResolvedReplacementRule {
  readonly id: string; readonly search: string; readonly replace: string;
  readonly sourceIndex: number; readonly derived: boolean;
}
export interface PnwCodeRuleMatchSummary {
  readonly ruleId: string; readonly search: string; readonly replace: string; readonly occurrences: number;
}
export interface PnwCodeStringReplacement { readonly output: string; readonly matches: readonly PnwCodeRuleMatchSummary[]; }
export interface PnwCodeTextReplacement extends PnwCodeStringReplacement { readonly occurrences: number; readonly lines: readonly number[]; }
export interface PnwCodeNameReplacementSuggestion { readonly currentName: string; readonly suggestedName: string; readonly matches: readonly PnwCodeRuleMatchSummary[]; }

/** Validates, derives and de-duplicates ordered literal replacement rules. */
export function pnwCodeResolveReplacementRules(
  rules: readonly PnwCodeReplacementRule[],
  preserveUpperCase = false,
): readonly PnwCodeResolvedReplacementRule[] {
  const explicit = rules.map((rule, sourceIndex) => ({ rule, sourceIndex }))
    .filter(({ rule }) => rule.enabled !== false && rule.search.length > 0)
    .map(({ rule, sourceIndex }) => ({ id: rule.id ?? `rule-${sourceIndex + 1}`, search: rule.search, replace: rule.replace, sourceIndex, derived: false }));
  if (!explicit.length) throw new Error("至少需要一条非空搜索规则");
  if (explicit.some((rule) => rule.search === rule.replace)) throw new Error("搜索内容与替换内容不能相同");
  const all = [...explicit];
  if (preserveUpperCase) for (const rule of explicit) {
    const search = rule.search.toUpperCase(); const replace = rule.replace.toUpperCase();
    if (search !== rule.search) all.push({ ...rule, id: `${rule.id}:upper`, search, replace, derived: true });
  }
  const deduped: PnwCodeResolvedReplacementRule[] = [];
  const bySearch = new Map<string, PnwCodeResolvedReplacementRule>();
  for (const rule of all) {
    const existing = bySearch.get(rule.search);
    if (existing) { if (existing.replace !== rule.replace) throw new Error(`搜索规则冲突：${rule.search}`); continue; }
    bySearch.set(rule.search, rule); deduped.push(rule);
  }
  return deduped;
}

/** Applies ordered literal rules; at each offset the longest matching search wins. */
export function pnwCodeReplaceStringByRules(input: string, rules: readonly PnwCodeResolvedReplacementRule[]): PnwCodeStringReplacement {
  let output = ""; let offset = 0; const counts = new Map<string, number>();
  while (offset < input.length) {
    const winner = winningRule(input, offset, rules);
    if (!winner) { output += input[offset]; offset += 1; continue; }
    output += winner.replace; counts.set(winner.id, (counts.get(winner.id) ?? 0) + 1); offset += winner.search.length;
  }
  return { output, matches: summaries(rules, counts) };
}

/** Adds stable one-based line projections for result UIs without doing file IO. */
export function pnwCodeReplaceTextByRules(input: string, rules: readonly PnwCodeResolvedReplacementRule[]): PnwCodeTextReplacement {
  const replaced = pnwCodeReplaceStringByRules(input, rules); const lines: number[] = [];
  let line = 1; let offset = 0;
  while (offset < input.length) {
    const winner = winningRule(input, offset, rules);
    if (winner) { if (lines.at(-1) !== line) lines.push(line); offset += winner.search.length; continue; }
    if (input[offset] === "\n") line += 1; offset += 1;
  }
  return { ...replaced, occurrences: replaced.matches.reduce((total, match) => total + match.occurrences, 0), lines };
}

export function pnwCodeSuggestNameReplacement(
  currentName: string,
  rules: readonly PnwCodeReplacementRule[],
  preserveUpperCase = false,
): PnwCodeNameReplacementSuggestion | undefined {
  const replacement = pnwCodeReplaceStringByRules(currentName, pnwCodeResolveReplacementRules(rules, preserveUpperCase));
  return !replacement.matches.length || replacement.output === currentName
    ? undefined
    : { currentName, suggestedName: replacement.output, matches: replacement.matches };
}

function winningRule(input: string, offset: number, rules: readonly PnwCodeResolvedReplacementRule[]): PnwCodeResolvedReplacementRule | undefined {
  let winner: PnwCodeResolvedReplacementRule | undefined;
  for (const rule of rules) if (input.startsWith(rule.search, offset) && (!winner || rule.search.length > winner.search.length)) winner = rule;
  return winner;
}
function summaries(rules: readonly PnwCodeResolvedReplacementRule[], counts: ReadonlyMap<string, number>): readonly PnwCodeRuleMatchSummary[] {
  return rules.filter((rule) => (counts.get(rule.id) ?? 0) > 0).map((rule) => ({ ruleId: rule.id, search: rule.search, replace: rule.replace, occurrences: counts.get(rule.id) ?? 0 }));
}
