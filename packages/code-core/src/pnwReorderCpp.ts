import { pnwMaskCppTrivia } from "./pnwCppSyntaxGuards.js";
import { pnwExtractLockedRegionContents, pnwFindLockedRegions } from "./pnwReorderHeader.js";
import { pnwReorderBoundaryWarnings } from "./pnwReorderBoundaryGuard.js";

export type PnwCppReorderResult = {
  text: string;
  changed: boolean;
  className?: string;
  warnings?: string[];
};

type CppBlock = {
  implName: string;
  text: string;
  separator: string;
  banner: string;
  signatureStart: number;
  bodyStart?: number;
  bodyEnd?: number;
  start: number;
  end: number;
};

const DEFAULT_SEPARATOR = "//----------------------------------------\n";
const SEPARATOR_RE = /^\/\/-+\s*$/;
const ANNOTATION_SEPARATOR_RE = /^\/\/-{2,}\s*[A-Za-z].*-{2,}\s*$/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSeparator(separator: string): string {
  const stripped = separator.replace(/[\r\n]+$/g, "").trim();
  return stripped ? `${stripped}\n` : DEFAULT_SEPARATOR;
}

function stripOuterBlankLines(text: string): string {
  const lines = text.split(/(?<=\n)/);
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (!lines.length) return "";
  const output = lines.join("");
  return output.endsWith("\n") ? output : `${output}\n`;
}

function cleanBlockText(text: string): string {
  let output = stripOuterBlankLines(text);
  if (!output) return "";
  output = output.trimEnd().replace(/\}\s*(\/\/-+\s*)$/, "}\n");
  output = output.replace(/^(?:\/\/-+\s*\n)+/, "");
  output = output.trimEnd().replace(/(?:\/\/-+\s*\n)+$/, "");
  output = output.replace(/^(?:\/\/-{2,}\s*[A-Za-z].*-{2,}\s*\n)+/, "");
  return output ? `${output.replace(/\n*$/, "")}\n` : "";
}

function isCodePosition(text: string, target: number): boolean {
  let i = 0;
  while (i < text.length && i < target) {
    if (text[i] === "/" && text[i + 1] === "/") {
      let end = i + 2;
      while (end < text.length && text[end] !== "\r" && text[end] !== "\n") end += 1;
      if (target < end) return false;
      i = end;
      continue;
    }
    if (text[i] === "/" && text[i + 1] === "*") {
      let end = i + 2;
      while (end + 1 < text.length && !(text[end] === "*" && text[end + 1] === "/")) end += 1;
      end = Math.min(end + 2, text.length);
      if (target < end) return false;
      i = end;
      continue;
    }
    if (text[i] === "\"" || text[i] === "'") {
      const quote = text[i];
      let end = i + 1;
      while (end < text.length) {
        if (text[end] === "\\") end += 2;
        else if (text[end] === quote) {
          end += 1;
          break;
        } else end += 1;
      }
      if (target < end) return false;
      i = end;
      continue;
    }
    i += 1;
  }
  return true;
}

function findClassName(text: string, fileStem: string): string | null {
  text = pnwMaskCppTrivia(text);
  const counts = new Map<string, number>();
  const regex = /\b([A-Za-z_]\w*)::((?:~[A-Za-z_]\w*)|~?[A-Za-z_]\w*|operator\s*[^\s(]+)\s*[<(]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const className = match[1];
    if (/^[A-Z]/.test(className)) counts.set(className, (counts.get(className) || 0) + 1);
  }
  if (!counts.size) return null;
  if (counts.has(fileStem)) return fileStem;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function isReturnTypeLine(line: string, className: string): boolean {
  const stripped = line.trim();
  if (!stripped || SEPARATOR_RE.test(stripped)) return false;
  if (stripped.startsWith("//") || stripped.startsWith("/*") || stripped.startsWith("#")) return false;
  if (/[};{]$/.test(stripped) || new RegExp(`\\b${escapeRegExp(className)}::`).test(stripped)) return false;
  if (/[()]/.test(stripped)) return false;
  return /^[\w:<>,\s*&]+(?:const|volatile|static|virtual|constexpr|inline|unsigned|signed|long|short|friend|explicit|mutable|\*)*\s*$/.test(stripped);
}

function includeReturnTypeLines(text: string, blockStart: number, previousEnd: number, className: string): number {
  let start = blockStart;
  let pos = blockStart;
  while (pos > previousEnd) {
    let lineEnd = pos - 1;
    while (lineEnd > previousEnd && (text[lineEnd] === "\r" || text[lineEnd] === "\n")) lineEnd -= 1;
    if (lineEnd <= previousEnd) break;
    const lineStart = text.lastIndexOf("\n", lineEnd - 1) + 1;
    if (!isReturnTypeLine(text.slice(lineStart, lineEnd + 1), className)) break;
    start = lineStart;
    pos = lineStart;
  }
  return start;
}

function splitPreambleAndBody(text: string, className: string): { preamble: string; body: string } {
  const code = pnwMaskCppTrivia(text);
  const escaped = escapeRegExp(className);
  const constructor = new RegExp(
    `^[ \\t]*(?:[\\w:<>,\\s*&]+\\s+)?\\b${escaped}::${escaped}\\s*\\(`,
    "m",
  );
  // Match the Python engine's safety boundary: files without a constructor
  // are left untouched because their generated/Wizard regions may be ordered.
  if (!constructor.test(code)) return { preamble: text, body: "" };

  const memberName = `(?:~${escaped}|~?[A-Za-z_]\\w*|operator\\s*[^\\s(]+)`;
  const returnType = `(?:[\\w:<>,~*&]+(?:[ \\t]+[\\w:<>,~*&]+)*[ \\t]+)?`;
  const regex = new RegExp(
    `^[ \\t]*${returnType}\\b${escaped}::${memberName}\\s*[<(]`,
    "m",
  );
  const match = regex.exec(code);
  if (!match) return { preamble: text, body: "" };
  const walked = walkBackBlockStart(text, match.index, 0, className);
  const start = walked.fileMetadataEnd ?? walked.blockStart;
  return { preamble: text.slice(0, start), body: text.slice(start) };
}

function advancePastFunctionEnd(text: string, start: number): { end: number; gluedSeparator: string } {
  let i = start;
  while (i < text.length && (text[i] === " " || text[i] === "\t")) i += 1;
  let gluedSeparator = "";
  if (text[i] === "/" && text[i + 1] === "/") {
    const separatorStart = i;
    while (i < text.length && text[i] !== "\r" && text[i] !== "\n") i += 1;
    const comment = text.slice(separatorStart, i);
    // An end-of-line explanation belongs to this definition, not to the next
    // member's separator. Only detach a purely decorative separator.
    if (SEPARATOR_RE.test(comment.trim())) gluedSeparator = normalizeSeparator(comment);
  }
  while (i < text.length && (text[i] === "\r" || text[i] === "\n")) i += 1;
  return { end: i, gluedSeparator };
}

function findFunctionBodyEnd(text: string, implementationStart: number): { end: number; gluedSeparator: string; bodyStart?: number; bodyEnd?: number } {
  const original = text;
  text = pnwMaskCppTrivia(text);
  const parenStart = text.indexOf("(", implementationStart);
  if (parenStart < 0) return { end: text.length, gluedSeparator: "" };
  let paren = 1;
  let i = parenStart + 1;
  while (i < text.length && paren > 0) {
    if (text[i] === "(") paren += 1;
    else if (text[i] === ")") paren -= 1;
    i += 1;
  }

  while (i < text.length) {
    while (i < text.length && /[ \t\r\n]/.test(text[i])) i += 1;
    if (i >= text.length) return { end: text.length, gluedSeparator: "" };
    const ch = text[i];
    if (ch === "{") {
      const bodyStart = i;
      let depth = 1;
      i += 1;
      while (i < text.length && depth > 0) {
        if (text[i] === "{") depth += 1;
        else if (text[i] === "}") depth -= 1;
        i += 1;
      }
      return { ...advancePastFunctionEnd(original, i), ...(depth === 0 ? { bodyStart, bodyEnd: i - 1 } : {}) };
    }
    if (ch === ";") {
      i += 1;
      while (i < text.length && text[i] !== "\r" && text[i] !== "\n") i += 1;
      return advancePastFunctionEnd(original, i);
    }
    if (ch === ":") {
      i += 1;
      let parenDepth = 0;
      let braceDepth = 0;
      while (i < text.length) {
        while (i < text.length && /[ \t\r\n]/.test(text[i])) i += 1;
        if (i >= text.length) return { end: text.length, gluedSeparator: "" };
        const current = text[i];
        if (current === "(") {
          parenDepth += 1;
          i += 1;
        } else if (current === ")") {
          parenDepth = Math.max(0, parenDepth - 1);
          i += 1;
        } else if (current === "{") {
          if (parenDepth === 0 && braceDepth === 0) {
            let previous = i - 1;
            while (previous >= 0 && (text[previous] === " " || text[previous] === "\t")) previous -= 1;
            if (text[previous] === ")") break;
            if (previous >= 0 && (/[_=,]/.test(text[previous]) || /[A-Za-z0-9]/.test(text[previous]))) {
              braceDepth += 1;
              i += 1;
            } else break;
          } else {
            braceDepth += 1;
            i += 1;
          }
        } else if (current === "}") {
          braceDepth = Math.max(0, braceDepth - 1);
          i += 1;
        } else i += 1;
      }
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      while (i < text.length && /[A-Za-z0-9_:]/.test(text[i])) i += 1;
      continue;
    }
    i += 1;
  }
  return { end: text.length, gluedSeparator: "" };
}

/** Own only a contiguous, fully framed line-comment banner, never a loose note. */
function findCommentBanner(text: string, bottomStart: number, previousEnd: number): { start: number; fileMetadata: boolean } | undefined {
  let pos = bottomStart;
  let hasDescription = false;
  let fileMetadata = false;
  while (pos > previousEnd) {
    const lineEnd = pos - 1;
    const lineStart = text.lastIndexOf("\n", lineEnd - 1) + 1;
    if (lineStart < previousEnd) return undefined;
    const line = text.slice(lineStart, lineEnd).trim();
    if (SEPARATOR_RE.test(line)) {
      if (!hasDescription) return undefined;
      // Preserve adjacent decorative lines too, including a formerly glued
      // separator that was detached from the preceding definition on a prior run.
      let start = lineStart;
      while (start > previousEnd) {
        const beforeEnd = start - 1;
        const beforeStart = text.lastIndexOf("\n", beforeEnd - 1) + 1;
        if (beforeStart < previousEnd || !SEPARATOR_RE.test(text.slice(beforeStart, beforeEnd).trim())) break;
        // An adjacent separator can close an earlier comment frame. Its preceding
        // explanation belongs to that frame, so never detach its closing line.
        if (beforeStart > previousEnd) {
          const precedingEnd = beforeStart - 1;
          const precedingStart = text.lastIndexOf("\n", precedingEnd - 1) + 1;
          const preceding = text.slice(precedingStart, precedingEnd).trim();
          if (preceding.startsWith("//") && !SEPARATOR_RE.test(preceding)) break;
        }
        start = beforeStart;
      }
      return { start, fileMetadata };
    }
    if (!line.startsWith("//") || pnwReorderBoundaryWarnings(line).length) return undefined;
    if (line.slice(2).trim()) hasDescription = true;
    if (/\b(?:copyright|SPDX-License-Identifier)\b|\bSPDX-[A-Za-z][\w-]*[ \t]*:|(?:^|\s)@(?:file|mainpage|page)\b/i.test(line.slice(2))) fileMetadata = true;
    pos = lineStart;
  }
  return undefined;
}

function walkBackBlockStart(
  text: string,
  functionLineStart: number,
  previousEnd: number,
  className: string,
): { blockStart: number; separator: string; bannerEnd?: number; fileMetadataEnd?: number } {
  // The return type is part of the signature. Walk above it before looking for
  // documentation and separators, otherwise both are left behind in a gap.
  let blockStart = includeReturnTypeLines(text, functionLineStart, previousEnd, className);
  let separator = "";
  let pos = blockStart;
  while (pos > previousEnd) {
    let lineEnd = pos - 1;
    while (lineEnd > previousEnd && (text[lineEnd] === "\r" || text[lineEnd] === "\n")) lineEnd -= 1;
    if (lineEnd <= previousEnd) break;
    let lineStart = text.lastIndexOf("\n", lineEnd - 1) + 1;
    if (lineStart <= previousEnd && previousEnd > 0) lineStart = previousEnd;
    const line = text.slice(lineStart, lineEnd + 1);
    const stripped = line.trim();
    if (!stripped) break;

    const glued = stripped.match(/^}\s*(\/\/-+\s*)$/);
    if (glued) {
      separator = normalizeSeparator(glued[1]);
      break;
    }
    if (SEPARATOR_RE.test(stripped)) {
      const banner = findCommentBanner(text, lineStart, previousEnd);
      if (banner?.fileMetadata) {
        // The initial split keeps the entire file metadata frame in the preamble.
        // Between definitions its unowned prefix still rejects reconstruction.
        return { blockStart: lineStart, separator: normalizeSeparator(stripped), fileMetadataEnd: pos };
      }
      if (banner) return { blockStart: banner.start, separator: "", bannerEnd: pos };
      separator = normalizeSeparator(stripped);
      blockStart = lineStart;
      break;
    }
    if (stripped.endsWith("*/")) {
      const commentStart = text.lastIndexOf("/*", lineEnd);
      if (commentStart >= previousEnd) {
        blockStart = commentStart;
        pos = commentStart;
        continue;
      }
      break;
    }
    if (ANNOTATION_SEPARATOR_RE.test(stripped)) {
      separator = normalizeSeparator(stripped);
      blockStart = lineStart;
      break;
    }
    if (stripped.startsWith("//")) {
      blockStart = lineStart;
      pos = lineStart;
      continue;
    }
    if (stripped.startsWith("#")) break;
    break;
  }
  return { blockStart, separator };
}

function scanBlocks(body: string, className: string): { blocks: CppBlock[]; trailingSeparator: string } {
  const code = pnwMaskCppTrivia(body);
  const escaped = escapeRegExp(className);
  const regex = new RegExp(`\\b${escaped}::((?:~${escaped})|~?[A-Za-z_]\\w*|operator\\s*[^\\s(]+)\\s*[<(]`, "g");
  const blocks: CppBlock[] = [];
  let previousEnd = 0;
  let pendingGluedSeparator = "";
  let match: RegExpExecArray | null;
  while ((match = regex.exec(code))) {
    if (match.index < previousEnd) continue;
    const implName = match[1].replace(/[<(]$/, "").trim();
    const functionLineStart = body.lastIndexOf("\n", Math.max(0, match.index - 1)) + 1;
    const walked = walkBackBlockStart(body, functionLineStart, previousEnd, className);
    const separator = walked.separator || pendingGluedSeparator;
    const banner = walked.bannerEnd === undefined ? ""
      : pendingGluedSeparator + body.slice(walked.blockStart, walked.bannerEnd);
    pendingGluedSeparator = "";
    const found = findFunctionBodyEnd(body, match.index);
    pendingGluedSeparator = found.gluedSeparator;
    const text = cleanBlockText(body.slice(walked.bannerEnd ?? walked.blockStart, found.end));
    if (!text.includes("{") && !text.includes("= delete") && !text.includes("= default")) {
      previousEnd = found.end;
      regex.lastIndex = Math.max(regex.lastIndex, found.end);
      continue;
    }
    blocks.push({ implName, text, separator, banner, signatureStart: includeReturnTypeLines(body, functionLineStart, previousEnd, className), bodyStart: found.bodyStart, bodyEnd: found.bodyEnd, start: walked.blockStart, end: found.end });
    previousEnd = found.end;
    regex.lastIndex = Math.max(regex.lastIndex, found.end);
  }
  return { blocks, trailingSeparator: pendingGluedSeparator };
}

function classifySpecial(className: string, block: CppBlock): number | null {
  const name = block.implName.replace(/\s+/g, "");
  const flat = block.text.replace(/\s+/g, " ");
  if (name.startsWith("~") || name === `~${className}`) return 2;
  if (name.startsWith("operator")) {
    if (name.startsWith("operator=")) return /operator\s*=\s*\([^)]*&&/.test(flat) ? 6 : 5;
    return 7;
  }
  if (name === className) {
    const escaped = escapeRegExp(className);
    if (new RegExp(`\\b${escaped}\\s*\\(\\s*const\\s+${escaped}\\s*&`).test(flat)) return 3;
    if (new RegExp(`\\b${escaped}\\s*\\(\\s*${escaped}\\s*&&`).test(flat)) return 4;
    if (new RegExp(`\\b${escaped}\\s*\\(\\s*\\)`).test(flat)) return 0;
    return 1;
  }
  return null;
}

function compareNames(left: CppBlock, right: CppBlock): number {
  return left.implName.localeCompare(right.implName, "en", { sensitivity: "base" });
}

function rebuildBlocks(blocks: CppBlock[], className: string): string {
  const special = blocks.filter((block) => classifySpecial(className, block) != null);
  const members = blocks.filter((block) => classifySpecial(className, block) == null);
  special.sort((a, b) => classifySpecial(className, a)! - classifySpecial(className, b)! || compareNames(a, b));
  members.sort(compareNames);
  let output = "";
  for (const block of [...special, ...members]) {
    const text = cleanBlockText(block.text);
    if (text) output += (block.banner || normalizeSeparator(block.separator)) + text;
  }
  return output;
}

function readConditionalCommand(line: string): string | undefined {
  const parsed = /^#[ \t]*(if|ifdef|ifndef|elif|else|endif)\b([^\n]*)$/.exec(line.trim());
  if (!parsed) return undefined;
  const command = parsed[1];
  const condition = parsed[2].trim();
  if (command === "ifdef" || command === "ifndef") {
    if (!/^[A-Za-z_]\w*$/.test(condition)) return undefined;
  } else if (command === "if" || command === "elif") {
    if (!/^(?:[01]|defined[ \t]+[A-Za-z_]\w*|defined[ \t]*\([ \t]*[A-Za-z_]\w*[ \t]*\))$/.test(condition)) return undefined;
  } else if (condition) return undefined;
  return command;
}

/** Only balanced, include-only preamble groups receive a directive exemption. */
function safePreambleConditionalIncludes(text: string): Set<number> | undefined {
  const code = pnwMaskCppTrivia(text);
  const allowed = new Set<number>();
  const branches: boolean[] = [];
  let previous = 0;
  for (const match of code.matchAll(/^[ \t]*#[^\n]*(?:\n|$)/gm)) {
    const offset = match.index!;
    if (branches.length && (code.slice(previous, offset).trim()
      || text.slice(previous, offset).split("\n").some(line => line.trimEnd().endsWith("\\")))) return undefined;
    const end = offset + match[0].length;
    const command = readConditionalCommand(match[0]);
    if (command) {
      const priorLine = text.slice(text.lastIndexOf("\n", Math.max(0, offset - 2)) + 1, offset);
      if (priorLine.trimEnd().endsWith("\\") || text.slice(offset, end).trimEnd().endsWith("\\")) return undefined;
      if (command === "if" || command === "ifdef" || command === "ifndef") branches.push(false);
      else if (!branches.length || (command !== "endif" && branches.at(-1))) return undefined;
      else if (command === "endif") branches.pop();
      else if (command === "else") branches[branches.length - 1] = true;
      allowed.add(offset);
    } else if (branches.length) {
      if (!/^[ \t]*#[ \t]*include[ \t]+(?:"[^"\n]+"|<[^>\n]+>)[ \t]*(?:\/\/[^\n]*)?(?:\n|$)$/.test(text.slice(offset, end))) return undefined;
      if (text.slice(offset, end).trimEnd().endsWith("\\")) return undefined;
    }
    previous = end;
  }
  return branches.length ? undefined : allowed;
}

/** Conditional branches may move only as part of one structurally complete body. */
function hasOnlySafeBodyConditionals(text: string, blocks: CppBlock[], preamble = "", ignoreOutsideBodies = false): boolean {
  // A locally closed group does not make an enclosing file-level group safe.
  const outerBranches: boolean[] = [];
  for (const match of pnwMaskCppTrivia(preamble).matchAll(/^[ \t]*#[ \t]*(if|ifdef|ifndef|elif|else|endif)\b/gm)) {
    const command = match[1];
    if (command === "if" || command === "ifdef" || command === "ifndef") outerBranches.push(false);
    else if (!outerBranches.length || (command !== "endif" && outerBranches.at(-1))) return false;
    else if (command === "endif") outerBranches.pop();
    else if (command === "else") outerBranches[outerBranches.length - 1] = true;
  }
  if (outerBranches.length) return false;
  const code = pnwMaskCppTrivia(text);
  const directives = [...code.matchAll(/^[ \t]*#[^\n]*(?:\n|$)/gm)]
    .map(match => ({ start: match.index!, end: match.index! + match[0].length, text: match[0].trim() }));
  const owners = new Map<CppBlock, typeof directives>();
  for (const directive of directives) {
    const owner = blocks.find(block => block.bodyStart !== undefined && block.bodyEnd !== undefined
      && directive.start > block.bodyStart && directive.end <= block.bodyEnd);
    if (!owner) {
      if (ignoreOutsideBodies) continue;
      return false;
    }
    const owned = owners.get(owner) ?? [];
    owned.push(directive);
    owners.set(owner, owned);
  }
  for (const [block, owned] of owners) {
    if (text.slice(block.start, block.bodyEnd! + 1).split("\n").some(line => line.trimEnd().endsWith("\\"))) return false;
    const delimiters: string[] = [];
    const branches: Array<{ depth: number; hasElse: boolean }> = [];
    let next = 0;
    for (let offset = block.bodyStart! + 1; offset < block.bodyEnd!;) {
      const directive = owned[next];
      if (directive && offset === directive.start) {
        const command = readConditionalCommand(directive.text);
        if (!command) return false;
        if (command === "if" || command === "ifdef" || command === "ifndef") {
          branches.push({ depth: delimiters.length, hasElse: false });
        } else {
          const branch = branches.at(-1);
          if (!branch || delimiters.length !== branch.depth || (command !== "endif" && branch.hasElse)) return false;
          if (command === "endif") branches.pop();
          else if (command === "else") branch.hasElse = true;
        }
        offset = directive.end;
        next += 1;
        continue;
      }
      const ch = code[offset++];
      if ("({[".includes(ch)) delimiters.push(ch);
      else if (")}]".includes(ch)) {
        const expected = ch === ")" ? "(" : ch === "}" ? "{" : "[";
        if (delimiters.length <= (branches.at(-1)?.depth ?? 0) || delimiters.pop() !== expected) return false;
      }
    }
    if (branches.length || delimiters.length || next !== owned.length) return false;
  }
  return true;
}

function reorderNormalizedCpp(text: string, fileStem: string, allowBodyConditionals = false): { text: string; className?: string; warnings?: string[] } {
  const className = findClassName(text, fileStem);
  if (!className) return { text };
  const split = splitPreambleAndBody(text, className);
  if (!split.body) return { text, className };
  const { blocks, trailingSeparator } = scanBlocks(split.body, className);
  if (!blocks.length) return { text, className };
  // A regex member parser does not own namespace closures, registration macros,
  // free functions or preprocessor branches between methods. Never discard them.
  let previous = 0;
  const unowned: string[] = [];
  for (const block of blocks) {
    unowned.push(split.body.slice(previous, block.start));
    previous = block.end;
  }
  const tail = split.body.slice(previous);
  if ([...unowned, tail].some(gap => pnwMaskCppTrivia(gap).trim())
    || (/^\s*#/m.test(pnwMaskCppTrivia(split.body)) && (!allowBodyConditionals || !hasOnlySafeBodyConditionals(split.body, blocks, split.preamble)))) {
    return { text, className, warnings: [`${className}: preserved source containing preprocessor directives or non-member code between definitions`] };
  }
  // A source trailer is not a member's documentation. Leave it at the end,
  // including a decorative separator originally glued to the final brace.
  const output = split.preamble + rebuildBlocks(blocks, className) + trailingSeparator + tail;
  if (JSON.stringify(pnwExtractLockedRegionContents(text)) !== JSON.stringify(pnwExtractLockedRegionContents(output))) {
    return { text, className, warnings: [`${className}: preserved source because sorting would change a protected region`] };
  }
  // Comments can carry requirements or generator metadata. A masked gap being
  // empty only proves it contains no code; it does not permit dropping text.
  if (unowned.some(gap => gap.trim())) {
    return { text, className, warnings: [`${className}: preserved source containing comments not attached to a definition`] };
  }
  return { text: output, className };
}

function findTieIncludes(text: string, code: string) {
  return [...text.matchAll(/^[ \t]*#[ \t]*include[ \t]+"(TIE_[A-Za-z_]\w*)\.h"[ \t]*(?:\/\/[^\n]*)?(?:\n|$)/gm)]
    .filter(match => /^[ \t]*#[ \t]*include\b/.test(code.slice(match.index!, match.index! + match[0].length)))
    .map(match => ({ start: match.index!, end: match.index! + match[0].length, name: match[1] }));
}

function findStrictTiePairs(text: string, code: string, className: string) {
  const calls = [...code.matchAll(/\bTIE_[A-Za-z_]\w*[ \t]*\(/g)];
  const includes = findTieIncludes(text, code);
  const pairs: Array<{ start: number; end: number }> = [];
  for (const call of calls) {
    const lineStart = text.lastIndexOf("\n", call.index! - 1) + 1;
    const newline = text.indexOf("\n", call.index!);
    const lineEnd = newline < 0 ? text.length : newline + 1;
    const registration = /^[ \t]*(TIE_[A-Za-z_]\w*)[ \t]*\([ \t]*([A-Za-z_]\w*)[ \t]*\)[ \t]*;[ \t]*(?:\/\/[^\n]*)?(?:\n|$)$/.exec(text.slice(lineStart, lineEnd));
    const include = includes.find(item => item.end <= lineStart && !code.slice(item.end, lineStart).trim());
    if (!registration || registration[2] !== className || !include || include.name !== registration[1]
      || pairs.some(pair => pair.start === include.start)) {
      return { pairs: [], reason: "containing unsupported TIE registration or non-member code" };
    }
    const precedingStart = text.lastIndexOf("\n", Math.max(0, include.start - 2)) + 1;
    if (text.slice(precedingStart, lineEnd).split("\n").some(line => line.trimEnd().endsWith("\\"))) {
      return { pairs: [], reason: "containing a TIE registration beside a continued physical line" };
    }
    pairs.push({ start: include.start, end: lineEnd });
  }
  if (pairs.length !== includes.length) return { pairs: [], reason: "containing an unpaired TIE include" };
  const allBlocks = scanBlocks(text, className).blocks;
  let scanned = 0; let braces = 0; let parens = 0; let brackets = 0;
  for (const pair of pairs) {
    while (scanned < pair.start) {
      const ch = code[scanned++];
      if (ch === "{") braces += 1; else if (ch === "}") braces -= 1;
      else if (ch === "(") parens += 1; else if (ch === ")") parens -= 1;
      else if (ch === "[") brackets += 1; else if (ch === "]") brackets -= 1;
    }
    if (braces || parens || brackets) return { pairs: [], reason: "containing a TIE registration outside file-level definition boundaries" };
    scanned = pair.end;
  }
  for (const pair of pairs) {
    const before = code.slice(0, pair.start).trimEnd();
    const precedingLine = before.slice(before.lastIndexOf("\n") + 1);
    if (isReturnTypeLine(precedingLine, className)) return { pairs: [], reason: "because a TIE registration may split a return type" };
    if (/\/\/[ \t]*-+[ \t]*$/.test(text.slice(0, pair.start).trimEnd())
      && /^\s*(?:[ \t]*\/\/(?![ \t]*-)[^\n]*\n)+[ \t]*\/\/[ \t]*-+[ \t]*(?:\n|$)/.test(text.slice(pair.end))) {
      return { pairs: [], reason: "because a TIE registration may split attached function documentation" };
    }
    if (allBlocks.some(block => block.signatureStart < pair.end
      && block.start + text.slice(block.start, block.end).trimEnd().length > pair.start)) {
      return { pairs: [], reason: "because a TIE registration splits a function signature or body" };
    }
  }

  return { pairs };
}

function reorderBarrierRun(originalSegment: string, className: string, preambleLength: number, afterBarrier: boolean, beforeBarrier: boolean): { text: string; reason?: string } {
  const isSorted = (blocks: CppBlock[]) => blocks.every((block, index) => {
    if (!index) return true;
    const previous = blocks[index - 1];
    const rank = (item: CppBlock) => classifySpecial(className, item) ?? 8;
    return rank(previous) < rank(block) || (rank(previous) === rank(block) && compareNames(previous, block) <= 0);
  });
  let output = "";
  const preamble = originalSegment.slice(0, preambleLength);
  const segment = originalSegment.slice(preambleLength);
  const run = scanBlocks(segment, className);
  let previous = 0;
  for (const [index, block] of run.blocks.entries()) {
    const gap = segment.slice(previous, block.start);
    if (index === 0) {
      if (pnwMaskCppTrivia(gap).trim()) return { text: originalSegment, reason: "containing non-member code after a TIE registration" };
    } else if (pnwMaskCppTrivia(gap).trim() || (gap.trim() && !isSorted(run.blocks))) {
      return { text: originalSegment, reason: "containing comments or non-member code not attached to a definition" };
    }
    if (index === 0 && afterBarrier && /\b(?:copyright|SPDX-License-Identifier)\b|\bSPDX-[A-Za-z][\w-]*[ \t]*:|(?:^|\s)@(?:file|mainpage|page)\b/i.test(gap)) {
      return { text: originalSegment, reason: "containing a file metadata frame after a TIE registration" };
    }
    previous = block.end;
  }
  const tail = segment.slice(previous);
  if (pnwMaskCppTrivia(tail).trim()) {
    return { text: originalSegment, reason: "containing non-member code between definitions" };
  }
  if (beforeBarrier && /\/\*|\/\/[ \t]*-+[ \t]*\n[ \t]*\/\/(?![ \t]*-)/.test(tail)) {
    return { text: originalSegment, reason: "because a TIE registration may split attached function documentation" };
  }
  output += preamble;
  if (!run.blocks.length || isSorted(run.blocks)) output += segment;
  else {
    const first = run.blocks[0];
    const prefix = originalSegment.slice(0, preambleLength + first.signatureStart);
    // A detached plain-comment paragraph after a registration can describe the
    // registration or the next method. Keep the first complete method with it
    // instead of guessing ownership. A framed method banner is unambiguous.
    const anchorFirst = afterBarrier && !first.banner
      && /^(?:[ \t]*\n)+[ \t]*\/\/(?![!\/]|[ \t]*-)/.test(prefix);
    if (anchorFirst) {
      output += segment.slice(0, first.end);
      const rest = segment.slice(first.end);
      const remaining = scanBlocks(rest, className);
      const end = remaining.blocks.at(-1)?.end ?? 0;
      output += isSorted(remaining.blocks) ? rest
        : rebuildBlocks(remaining.blocks, className) + remaining.trailingSeparator + rest.slice(end);
    } else {
      output += segment.slice(0, first.start) + rebuildBlocks(run.blocks, className) + run.trailingSeparator + tail;
    }
  }
  return { text: output };
}

/** A mixed-barrier run containing only completely locked definitions stays raw. */
function isFullyLockedRun(text: string, className: string): boolean {
  if (pnwReorderBoundaryWarnings(text).length) return false;
  const locks = pnwFindLockedRegions(text);
  const blocks = scanBlocks(text, className).blocks;
  if (!locks.length || !blocks.length) return false;
  let previous = 0;
  for (const block of blocks) {
    if (block.bodyStart === undefined || block.bodyEnd === undefined
      || pnwMaskCppTrivia(text.slice(previous, block.start)).trim()
      || pnwMaskCppTrivia(text.slice(block.bodyEnd + 1, block.end)).trim()
      || !locks.some(lock => lock.start <= block.signatureStart && lock.end >= block.bodyEnd! + 1)) return false;
    previous = block.end;
  }
  return !pnwMaskCppTrivia(text.slice(previous)).trim();
}

/** Strict include/registration pairs are opaque; unrelated macros remain unowned. */
function reorderTieCpp(text: string, fileStem: string): ReturnType<typeof reorderNormalizedCpp> | undefined {
  const code = pnwMaskCppTrivia(text);
  const calls = [...code.matchAll(/\bTIE_[A-Za-z_]\w*[ \t]*\(/g)];
  if (!calls.length || /^[ \t]*#[ \t]*pragma[ \t]+(?:region|endregion)\b/m.test(code)) return undefined;
  const className = findClassName(text, fileStem);
  const blocked = (reason: string) => ({ text, ...(className ? { className } : {}), warnings: [`${className ?? fileStem}: preserved source ${reason}`] });
  if (!className) return { text };
  const split = splitPreambleAndBody(text, className);
  if (!split.body) return { text, className };
  const includes = findTieIncludes(text, code);
  // Registrations already wholly in the preamble were preserved by the legacy
  // path. Keep that output unless body directives require the strict mixed checks.
  if (calls.every(call => call.index! < split.preamble.length) && !/^[ \t]*#/m.test(pnwMaskCppTrivia(split.body))) {
    for (const include of includes) {
      const before = code.slice(0, include.start).trimEnd();
      if (isReturnTypeLine(before.slice(before.lastIndexOf("\n") + 1), className)) {
        return blocked("because a TIE registration may split a return type");
      }
    }
    return undefined;
  }
  const foundPairs = findStrictTiePairs(text, code, className);
  if (foundPairs.reason) return blocked(foundPairs.reason);
  const pairs = foundPairs.pairs;
  const allBlocks = scanBlocks(text, className).blocks;
  const safeBodies = hasOnlySafeBodyConditionals(text, allBlocks, "", true);
  const preambleDirectives = safePreambleConditionalIncludes(split.preamble);
  for (const directive of code.matchAll(/^[ \t]*#[^\n]*/gm)) {
    if (pairs.some(pair => directive.index! >= pair.start && directive.index! < pair.end)) continue;
    if (directive.index! < split.preamble.length
      && (/^[ \t]*#[ \t]*include\b/.test(directive[0]) || preambleDirectives?.has(directive.index!))) continue;
    if (safeBodies && allBlocks.some(block => block.bodyStart !== undefined && block.bodyEnd !== undefined
      && directive.index! > block.bodyStart && directive.index! + directive[0].length <= block.bodyEnd)) continue;
    const original = reorderNormalizedCpp(text, fileStem);
    return original.warnings ? original : blocked("containing preprocessor directives or non-member code outside a TIE registration");
  }
  let output = ""; let cursor = 0;
  for (const barrier of [...pairs, { start: text.length, end: text.length }]) {
    const originalSegment = text.slice(cursor, barrier.start);
    const preambleLength = Math.min(originalSegment.length, Math.max(0, split.preamble.length - cursor));
    const run = reorderBarrierRun(originalSegment, className, preambleLength, cursor > 0, barrier.start < text.length);
    if (run.reason) return blocked(run.reason);
    output += run.text;
    output += text.slice(barrier.start, barrier.end);
    cursor = barrier.end;
  }
  if (JSON.stringify(pnwExtractLockedRegionContents(text)) !== JSON.stringify(pnwExtractLockedRegionContents(output))) {
    return blocked("because sorting would change a protected region");
  }
  return { text: output, className };
}

type PragmaSpan = { start: number; end: number };

/** Only real, complete file-level region pairs become immutable ordering barriers. */
function reorderPragmaCpp(text: string, fileStem: string): ReturnType<typeof reorderNormalizedCpp> | undefined {
  const masked = pnwMaskCppTrivia(text);
  const directives = [...masked.matchAll(/^[ \t]*(?:\uFEFF)?#[ \t]*pragma[ \t]+(region|endregion)\b[^\n]*(?:\n|$)/gm)]
    .map(match => ({ start: match.index!, end: match.index! + match[0].length, opening: match[1] === "region" }));
  if (!directives.length) return undefined;
  const blocked = (reason: string, className?: string) => ({ text, ...(className ? { className } : {}), warnings: [`${className ?? fileStem}: preserved source ${reason}`] });
  const regions: PragmaSpan[] = [];
  const stack: typeof directives = [];
  let scanned = 0;
  let braces = 0; let parens = 0; let brackets = 0;
  for (const directive of directives) {
    while (scanned < directive.start) {
      const ch = masked[scanned++];
      if (ch === "{") braces += 1; else if (ch === "}") braces -= 1;
      else if (ch === "(") parens += 1; else if (ch === ")") parens -= 1;
      else if (ch === "[") brackets += 1; else if (ch === "]") brackets -= 1;
    }
    const previousEnd = Math.max(0, directive.start - 1);
    const previousLine = text.slice(text.lastIndexOf("\n", previousEnd - 1) + 1, previousEnd);
    if (text.slice(directive.start, directive.end).trimEnd().endsWith("\\") || previousLine.trimEnd().endsWith("\\")) {
      return blocked("containing a pragma region beside a continued physical line");
    }
    if (braces || parens || brackets) return blocked("containing a pragma region outside file-level definition boundaries");
    scanned = directive.end;
    if (directive.opening) stack.push(directive);
    else {
      const opening = stack.pop();
      if (!opening) return blocked("containing an unmatched pragma region boundary");
      if (!stack.length) regions.push({ start: opening.start, end: directive.end });
    }
  }
  if (stack.length) return blocked("containing an unmatched pragma region boundary");

  // Removing only directive lines exposes the original safety checks to every
  // region's contents. This text is analysis-only; output uses original slices.
  let removedParts: PragmaSpan[] = directives;
  let flat = ""; let copied = 0;
  for (const directive of removedParts) { flat += text.slice(copied, directive.start); copied = directive.end; }
  flat += text.slice(copied);
  const originalOffset = (offset: number, end = false): number => {
    let removed = 0;
    for (const directive of removedParts) {
      const position = directive.start - removed;
      if (offset < position || (end && offset === position)) break;
      removed += directive.end - directive.start;
    }
    return offset + removed;
  };
  const className = findClassName(flat, fileStem);
  if (!className) return { text };
  const hasTie = /\bTIE_[A-Za-z_]\w*[ \t]*\(/.test(masked);
  let pairs: PragmaSpan[] = [];
  if (hasTie) {
    const found = findStrictTiePairs(text, masked, className);
    if (found.reason) return blocked(found.reason, className);
    pairs = found.pairs;
    if (pairs.some(pair => regions.some(region => pair.start < region.end && pair.end > region.start))) {
      return blocked("containing overlapping TIE registration and pragma region boundaries", className);
    }
    removedParts = [...directives, ...pairs].sort((a, b) => a.start - b.start);
    flat = ""; copied = 0;
    for (const part of removedParts) { flat += text.slice(copied, part.start); copied = part.end; }
    flat += text.slice(copied);
  }
  const split = splitPreambleAndBody(flat, className);
  if (!split.body) return { text, className };
  if (hasTie && [...pnwMaskCppTrivia(split.preamble).matchAll(/^[ \t]*#[^\n]*/gm)]
    .some(match => !/^[ \t]*#[ \t]*include\b/.test(match[0]))) {
    return blocked("containing unsupported preamble directives beside TIE and pragma boundaries", className);
  }
  const scannedBlocks = scanBlocks(split.body, className).blocks;
  if (!scannedBlocks.length) return { text, className };
  let previous = 0;
  const unowned: string[] = [];
  for (const block of scannedBlocks) { unowned.push(split.body.slice(previous, block.start)); previous = block.end; }
  const tail = split.body.slice(previous);
  if ([...unowned, tail].some(gap => pnwMaskCppTrivia(gap).trim()) || /^\s*#/m.test(pnwMaskCppTrivia(split.body))) {
    return blocked("containing preprocessor directives or non-member code between definitions", className);
  }
  previous = 0;
  for (const block of scannedBlocks) {
    const gap = split.body.slice(previous, block.start);
    if (gap.trim()) {
      const start = originalOffset(split.preamble.length + previous + gap.search(/\S/));
      const end = originalOffset(split.preamble.length + previous + gap.trimEnd().length, true);
      if (!hasTie && !regions.some(region => start >= region.start && end <= region.end)) {
        return blocked("containing comments not attached to a definition", className);
      }
    }
    previous = block.end;
  }
  const blocks = scannedBlocks.map(block => {
    let start = originalOffset(split.preamble.length + block.start);
    const signatureStart = originalOffset(split.preamble.length + block.signatureStart);
    const precedingRegion = regions.find(region => start >= region.start && start < region.end && signatureStart >= region.end);
    if (precedingRegion && !block.banner && !/^\s*\/\*/m.test(split.body.slice(block.start, block.signatureStart))) {
      // Flattening must not assign an empty region's explanation or a complete
      // nested lock's closing marker to the following outside function. Respect
      // the original endregion when attaching plain comments; framed/Doxygen
      // documentation and split signatures still require an uncut extent.
      const functionLineStart = text.lastIndexOf("\n", signatureStart - 1) + 1;
      start = walkBackBlockStart(text, functionLineStart, precedingRegion.end, className).blockStart;
    }
    if (hasTie) {
      const lowerBoundary = Math.max(0,
        ...[...regions, ...pairs].filter(part => part.end <= signatureStart).map(part => part.end),
        ...regions.filter(part => part.start <= signatureStart && signatureStart < part.end).map(part => part.start));
      if (start < lowerBoundary && !block.banner && !/^\s*\/\*/m.test(split.body.slice(block.start, block.signatureStart))) {
        const functionLineStart = text.lastIndexOf("\n", signatureStart - 1) + 1;
        start = walkBackBlockStart(text, functionLineStart, lowerBoundary, className).blockStart;
      }
    }
    return {
      start,
      // The scanner consumes blank lines after a definition. They are not part of
      // its semantic extent and must not appear to cross a removed endregion.
      end: originalOffset(split.preamble.length + block.start + split.body.slice(block.start, block.end).trimEnd().length, true),
    };
  });
  for (const directive of removedParts) {
    if (blocks.some(block => block.start < directive.end && block.end > directive.start)) {
      return blocked("because a pragma region splits a function signature, body or attached comment", className);
    }
  }
  for (const region of regions) {
    if (pnwReorderBoundaryWarnings(text.slice(region.start, region.end)).length) {
      return blocked("because a pragma region crosses another protection boundary", className);
    }
    // Even code before the first constructor may be inside a region. Do not let
    // preamble handling conceal registrations, helpers or other directives there.
    const covered = [...directives.filter(part => part.start >= region.start && part.end <= region.end),
      ...blocks.filter(block => block.start >= region.start && block.end <= region.end)].sort((a, b) => a.start - b.start);
    let cursor = region.start; let remaining = "";
    for (const part of covered) { remaining += text.slice(cursor, part.start); cursor = Math.max(cursor, part.end); }
    remaining += text.slice(cursor, region.end);
    if (pnwMaskCppTrivia(remaining).trim()) return blocked("containing preprocessor directives or non-member code inside a pragma region", className);
  }

  let output = ""; let cursor = 0;
  const barriers = [...regions, ...pairs].sort((a, b) => a.start - b.start);
  barriers.push({ start: text.length, end: text.length });
  for (const barrier of barriers) {
    if (hasTie) {
      const segment = text.slice(cursor, barrier.start);
      const preambleLength = Math.min(segment.length, Math.max(0, originalOffset(split.preamble.length) - cursor));
      const body = segment.slice(preambleLength);
      if (pnwReorderBoundaryWarnings(segment).length) {
        return blocked("because a protection boundary crosses an ordering barrier", className);
      }
      const locks = pnwFindLockedRegions(body);
      if (scanBlocks(body, className).blocks.some(block => block.bodyEnd !== undefined
        && locks.some(lock => lock.start < block.bodyEnd! + 1 && lock.end > block.signatureStart
          && (lock.start > block.signatureStart || lock.end < block.bodyEnd! + 1)))) {
        return blocked("because a protection boundary splits a function signature or body", className);
      }
      const run = isFullyLockedRun(body, className) ? { text: segment }
        : reorderBarrierRun(segment, className, preambleLength, cursor > 0, barrier.start < text.length);
      if (run.reason) return blocked(run.reason, className);
      output += run.text + text.slice(barrier.start, barrier.end);
      cursor = barrier.end;
      continue;
    }
    const first = blocks.find(block => block.start >= cursor && block.end <= barrier.start);
    if (!first) output += text.slice(cursor, barrier.start);
    else {
      output += text.slice(cursor, first.start);
      const body = text.slice(first.start, barrier.start);
      const run = scanBlocks(body, className);
      let end = 0;
      for (const block of run.blocks) {
        if (body.slice(end, block.start).trim()) return blocked("containing comments not attached to a definition", className);
        end = block.end;
      }
      if (!run.blocks.length || pnwMaskCppTrivia(body.slice(end)).trim()) return blocked("containing non-member code between definitions", className);
      output += rebuildBlocks(run.blocks, className) + run.trailingSeparator + body.slice(end);
    }
    output += text.slice(barrier.start, barrier.end);
    cursor = barrier.end;
  }
  if (JSON.stringify(pnwExtractLockedRegionContents(text)) !== JSON.stringify(pnwExtractLockedRegionContents(output))) {
    return blocked("because sorting would change a protected region", className);
  }
  return { text: output, className };
}

export function pnwReorderCppText(text: string, fileStem: string): PnwCppReorderResult {
  const warnings = pnwReorderBoundaryWarnings(text);
  if (warnings.length) return { text, changed: false, warnings };
  const eol = text.includes("\r\n") ? "\r\n" : text.includes("\r") ? "\r" : "\n";
  const normalized = text.replace(/\r\n|\r/g, "\n");
  if (new Set(text.match(/\r\n|\r|\n/g)).size > 1
    && /^[ \t]*#[ \t]*pragma[ \t]+(?:region|endregion)\b/m.test(pnwMaskCppTrivia(normalized))) {
    return { text, changed: false, warnings: ["Preserved source containing mixed line endings around pragma regions"] };
  }
  if (new Set(text.match(/\r\n|\r|\n/g)).size > 1
    && /\bTIE_[A-Za-z_]\w*[ \t]*\(/.test(pnwMaskCppTrivia(normalized))) {
    return { text, changed: false, warnings: ["Preserved source containing mixed line endings around TIE registrations"] };
  }
  if (new Set(text.match(/\r\n|\r|\n/g)).size > 1
    && /^[ \t]*#[ \t]*(?:if|ifdef|ifndef|elif|else|endif)\b/m.test(pnwMaskCppTrivia(normalized))) {
    return { text, changed: false, warnings: ["Preserved source containing mixed line endings around conditional directives"] };
  }
  const allowBodyConditionals = !/\bTIE_[A-Za-z_]\w*[ \t]*\(/.test(pnwMaskCppTrivia(normalized));
  const result = reorderTieCpp(normalized, fileStem) ?? reorderPragmaCpp(normalized, fileStem) ?? reorderNormalizedCpp(normalized, fileStem, allowBodyConditionals);
  const output = eol === "\n" ? result.text : result.text.replace(/\n/g, eol);
  return { text: output, changed: output !== text, className: result.className, ...(result.warnings ? { warnings: result.warnings } : {}) };
}
