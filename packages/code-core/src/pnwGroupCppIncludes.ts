import { pnwMaskCppTrivia } from "./pnwCppSyntaxGuards.js";
import { pnwFindLockedRegions } from "./pnwReorderHeader.js";
import { pnwReorderBoundaryWarnings } from "./pnwReorderBoundaryGuard.js";

export const PNW_INCLUDE_GROUPING_VERSION = 1;
export type PnwCppIncludeGroup = "standard-library" | "third-party" | "caa-sdk" | "project";
export type PnwTrustedCppHeader = {
  header: string;
  group: PnwCppIncludeGroup;
  delimiter?: "angle" | "quote";
};
export type PnwGroupCppIncludesOptions = {
  sortIncludes?: boolean;
  trustedHeaders?: readonly PnwTrustedCppHeader[];
};
export type PnwGroupCppIncludesResult = {
  text: string;
  changed: boolean;
  warnings: string[];
  /** Exact custom rules used by runs that actually changed, for Host dependency checks. */
  usedTrustedHeaders: readonly PnwTrustedCppHeader[];
};

const GROUPS: readonly PnwCppIncludeGroup[] = ["standard-library", "third-party", "caa-sdk", "project"];
// Frozen C++23 N4950 tables 24/25 and 40, including C compatibility headers.
// Primary standard draft: https://timsong-cpp.github.io/cppwp/n4950/headers
// https://timsong-cpp.github.io/cppwp/n4950/support.c.headers
// Quoted spellings require trusted resolution: a local file may shadow a name.
const STANDARD_HEADERS = new Set((
  "algorithm any array atomic barrier bit bitset charconv chrono codecvt compare complex concepts condition_variable "
  + "coroutine deque exception execution expected filesystem flat_map flat_set format forward_list fstream functional "
  + "future generator initializer_list iomanip ios iosfwd iostream istream iterator latch limits list locale map mdspan "
  + "memory memory_resource mutex new numbers numeric optional ostream print queue random ranges ratio regex "
  + "scoped_allocator semaphore set shared_mutex source_location span spanstream sstream stack stacktrace stdexcept "
  + "stdfloat stop_token streambuf string string_view strstream syncstream system_error thread tuple type_traits "
  + "typeindex typeinfo unordered_map unordered_set utility valarray variant vector version "
  + "cassert cctype cerrno cfenv cfloat cinttypes climits clocale cmath csetjmp csignal cstdarg cstddef cstdint cstdio "
  + "cstdlib cstring ctime cuchar cwchar cwctype "
  + "assert.h complex.h ctype.h errno.h fenv.h float.h inttypes.h iso646.h limits.h locale.h math.h setjmp.h signal.h "
  + "stdalign.h stdarg.h stdatomic.h stdbool.h stddef.h stdint.h stdio.h stdlib.h string.h tgmath.h time.h uchar.h wchar.h wctype.h"
).split(" "));

type Line = { start: number; end: number; content: string; eol: string; code: string; continued: boolean };
type Include = { line: Line; header: string; group: PnwCppIncludeGroup; index: number; trusted: readonly PnwTrustedCppHeader[] };
type Span = { start: number; end: number };

function splitLines(text: string, code: string): Line[] {
  const lines: Line[] = [];
  let continued = false;
  for (const match of text.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)) {
    if (!match[0]) continue;
    const eol = match[0].match(/\r\n|\r|\n$/)?.[0] ?? "";
    const content = match[0].slice(0, match[0].length - eol.length);
    lines.push({ start: match.index!, end: match.index! + match[0].length, content, eol,
      code: code.slice(match.index!, match.index! + content.length), continued });
    continued = /\\[ \t]*$/.test(content);
  }
  return lines;
}

function protectedSpans(text: string, lines: Line[]): Span[] {
  const spans: Span[] = [...pnwFindLockedRegions(text)];
  const pending: number[] = [];
  for (const line of lines) {
    if (/^[ \t]*\/\/[ \t]*KEVIN_SYSTEM_CODE[ \t]+START\b/i.test(line.content)) pending.push(line.start);
    if (/^[ \t]*\/\/[ \t]*KEVIN_SYSTEM_CODE[ \t]+END\b/i.test(line.content)) {
      const start = pending.pop();
      if (start !== undefined) spans.push({ start, end: line.end });
    }
  }
  return spans;
}

function conditionalWarnings(lines: Line[]): string[] {
  const pending: Array<{ line: number; sawElse: boolean }> = [];
  const warnings: string[] = [];
  for (const [index, line] of lines.entries()) {
    if (line.continued) continue;
    const directive = /^[ \t]*#[ \t]*(if|ifdef|ifndef|elif|else|endif)\b/.exec(line.code)?.[1];
    if (!directive) continue;
    if (/^(?:if|ifdef|ifndef)$/.test(directive)) pending.push({ line: index + 1, sawElse: false });
    else if (!pending.length) warnings.push(`Line ${index + 1}: include grouping skipped because a conditional boundary has no opening directive`);
    else if (directive === "endif") pending.pop();
    else {
      const active = pending[pending.length - 1];
      if (active.sawElse) warnings.push(`Line ${index + 1}: include grouping skipped because a conditional branch follows #else`);
      if (directive === "else") active.sawElse = true;
    }
  }
  for (const branch of pending) warnings.push(`Line ${branch.line}: include grouping skipped because a conditional boundary has no closing directive`);
  return warnings;
}

function compareIncludes(left: Include, right: Include): number {
  return GROUPS.indexOf(left.group) - GROUPS.indexOf(right.group)
    || (left.header < right.header ? -1 : left.header > right.header ? 1 : 0)
    || left.index - right.index;
}

/** Group only confidently classified include runs; unknown source is an anchor. */
export function pnwGroupCppIncludesText(text: string, options: PnwGroupCppIncludesOptions = {}): PnwGroupCppIncludesResult {
  if (options.sortIncludes !== true) return { text, changed: false, warnings: [], usedTrustedHeaders: [] };
  const warnings = pnwReorderBoundaryWarnings(text);
  const bom = text.startsWith("\uFEFF") ? "\uFEFF" : "";
  const source = text.slice(bom.length);
  const masked = pnwMaskCppTrivia(source);
  const lines = splitLines(source, masked);
  if (masked.includes("/*")) warnings.push("Include grouping skipped because a block comment is unterminated");
  warnings.push(...conditionalWarnings(lines));
  const trusted = options.trustedHeaders ?? [];
  for (const [index, item] of trusted.entries()) {
    if (!item || typeof item.header !== "string" || !item.header || !GROUPS.includes(item.group)
      || (item.delimiter !== undefined && item.delimiter !== "angle" && item.delimiter !== "quote")) {
      warnings.push(`Trusted header entry ${index + 1}: include grouping skipped because its classification is invalid`);
    }
  }
  if (warnings.length) return { text, changed: false, warnings, usedTrustedHeaders: [] };
  const protectedRanges = protectedSpans(source, lines);
  const edits: Array<{ start: number; end: number; replacement: string }> = [];
  const usedTrustedHeaders = new Map<string, PnwTrustedCppHeader>();
  let run: Include[] = [];
  let commentAnchor = false;

  function flush(): void {
    if (run.length > 1) {
      const sorted = [...run].sort(compareIncludes);
      const first = run[0].line;
      const last = run[run.length - 1].line;
      const eol = run.find(item => item.line.eol)?.line.eol ?? "\n";
      let replacement = "";
      for (let i = 0; i < sorted.length; i += 1) {
        if (i && sorted[i - 1].group !== sorted[i].group) replacement += eol;
        // Keep the existing physical-line ending slots, especially the final
        // no-newline slot, rather than moving an EOF-only line into the middle.
        replacement += sorted[i].line.content + (i === sorted.length - 1 ? last.eol : run[i].line.eol || eol);
      }
      if (source.slice(first.start, last.end) !== replacement) {
        edits.push({ start: first.start, end: last.end, replacement });
        for (const item of run) {
          for (const rule of item.trusted) {
            const key = JSON.stringify([rule.header, rule.group, rule.delimiter ?? null]);
            usedTrustedHeaders.set(key, { header: rule.header, group: rule.group, ...(rule.delimiter ? { delimiter: rule.delimiter } : {}) });
          }
        }
      }
    }
    run = [];
  }

  for (const [index, line] of lines.entries()) {
    if (line.continued || /\\[ \t]*$/.test(line.content)
      || protectedRanges.some(span => line.start < span.end && line.end > span.start)) {
      flush();
      commentAnchor = false;
      continue;
    }
    if (!line.content.trim()) {
      commentAnchor = false;
      continue;
    }
    // Both the original spelling and the comment/string-masked source must
    // identify a genuine directive, never an include-looking raw-string line.
    const match = /^[ \t]*#[ \t]*include[ \t]*(?:<([^>\r\n]+)>|"([^"\r\n]+)")[ \t]*(?:(?:\/\/[^\r\n]*)|(?:\/\*[^\r\n]*?\*\/[ \t]*))?$/.exec(line.content);
    if (!match || !/^[ \t]*#[ \t]*include\b/.test(line.code)) {
      flush();
      // Standalone comments can describe a whole group. Keep them and the
      // immediately following include together as a fixed boundary.
      commentAnchor = !line.code.trim() && /\/[/\*]|\*\//.test(line.content);
      continue;
    }
    const header = match[1] ?? match[2];
    const delimiter = match[1] !== undefined ? "angle" : "quote";
    if (commentAnchor || /(?:^|[/\\])TIE_[^/\\]*\.h$/i.test(header)) {
      flush();
      commentAnchor = false;
      continue;
    }
    const groups = new Set<PnwCppIncludeGroup>();
    if (delimiter === "angle" && STANDARD_HEADERS.has(header)) groups.add("standard-library");
    const matchedTrusted = trusted.filter(item => item.header === header && (!item.delimiter || item.delimiter === delimiter));
    for (const item of matchedTrusted) groups.add(item.group);
    if (groups.size !== 1) {
      flush();
      if (groups.size > 1) warnings.push(`Line ${index + 1}: include grouping kept an ambiguous header classification in place`);
      continue;
    }
    run.push({ line, header, group: [...groups][0], index, trusted: matchedTrusted });
  }
  flush();
  let output = source;
  for (const edit of edits.reverse()) output = output.slice(0, edit.start) + edit.replacement + output.slice(edit.end);
  output = bom + output;
  return { text: output, changed: output !== text, warnings, usedTrustedHeaders: [...usedTrustedHeaders.values()] };
}
