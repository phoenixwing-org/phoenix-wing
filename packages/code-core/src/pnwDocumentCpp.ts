import { pnwAddMissingFunctionComment, pnwIsFunctionCommentExcluded } from "./pnwCppFunctionComments.js";
import { pnwMaskCppTrivia } from "./pnwCppSyntaxGuards.js";
import { pnwFindLockedRegions } from "./pnwReorderHeader.js";
import { pnwReorderBoundaryWarnings } from "./pnwReorderBoundaryGuard.js";

export type PnwDocumentCppOptions = { headerText?: string };
export type PnwDocumentCppResult = { text: string; changed: boolean; warnings: string[] };

type Span = { start: number; end: number };
type Signature = { name: string; className: string; qualified: boolean };

const NAME = "(?:[A-Za-z_]\\w*::)*(?:~?[A-Za-z_]\\w*|operator\\s*=(?!=))";
const ORDINARY_TYPE = /^[\w\s:<>,*&]+$/;
const NON_FUNCTION = /\b(?:typedef|using|class|struct|enum|union|namespace|return|if|for|while|switch|catch|concept|requires)\b/;

function lineNumber(text: string, offset: number): number {
  return text.slice(0, offset).split("\n").length;
}

function maskSpans(text: string, spans: Span[]): string {
  const chars = text.split("");
  for (const span of spans) {
    for (let i = span.start; i < span.end; i += 1) if (chars[i] !== "\n") chars[i] = " ";
  }
  return chars.join("");
}

function closingBrace(code: string, open: number, end: number): number {
  let depth = 1;
  for (let i = open + 1; i < end; i += 1) {
    if (code[i] === "{") depth += 1;
    if (code[i] === "}" && --depth === 0) return i;
  }
  return -1;
}

function identifySignature(prefix: string): Signature | undefined {
  const match = new RegExp(`\\b(${NAME})\\s*\\(`).exec(prefix);
  if (!match) return;
  const fullName = match[1];
  const parts = fullName.split("::");
  const name = parts[parts.length - 1];
  const className = parts.length > 1 ? parts[parts.length - 2] : "";
  const returnType = prefix.slice(0, match.index).trim();
  const special = !!className && (name === className || name === `~${className}`);
  const assignment = !!className && name.replace(/\s+/g, "") === "operator=";
  if (NON_FUNCTION.test(prefix) || /\b(?:template|decltype)\b/.test(prefix)
    || /\boperator\b/.test(prefix) && !assignment) return;
  if ((!special && (!returnType || !ORDINARY_TYPE.test(returnType)))
    || (special && returnType && !/^(?:(?:inline|constexpr|consteval|explicit)\s*)+$/.test(returnType))) return;
  const open = match.index + match[0].lastIndexOf("(");
  let depth = 1;
  let close = open + 1;
  for (; close < prefix.length && depth; close += 1) {
    if (prefix[close] === "(") depth += 1;
    if (prefix[close] === ")") depth -= 1;
  }
  if (depth) return;
  const suffix = prefix.slice(close).trim();
  // Initializer lists, requires expressions, attributes and exception function
  // try blocks need a C++ parser. Never guess where those signatures end.
  const qualifiers = "(?:(?:const|volatile|override|final|&{1,2})\\s*|noexcept(?:\\s*\\([^()]*\\))?\\s*)*";
  if (!new RegExp(`^${qualifiers}(?:->\\s*[\\w\\s:<>,*&]+)?$`).test(suffix)) return;
  return { name, className, qualified: parts.length > 1 };
}

/**
 * Document confidently recognized source definitions without moving source code.
 * This deliberately supports ordinary signatures, not the complete C++ grammar.
 */
export function pnwDocumentCppFunctionsText(text: string, options: PnwDocumentCppOptions = {}): PnwDocumentCppResult {
  const boundaryWarnings = pnwReorderBoundaryWarnings(text);
  if (boundaryWarnings.length) return { text, changed: false, warnings: boundaryWarnings };
  const eol = text.includes("\r\n") ? "\r\n" : text.includes("\r") ? "\r" : "\n";
  const source = text.replace(/\r\n|\r/g, "\n");
  const masked = pnwMaskCppTrivia(source);
  const warnings: string[] = [];
  const warn = (offset: number, reason: string) => warnings.push(`Line ${lineNumber(source, offset)}: ${reason}`);
  const locked = pnwFindLockedRegions(source);
  const protectedSpans: Span[] = [...locked];
  const directiveSpans: Span[] = [];
  const marker = /^[ \t]*\/\/\s*(?:clang-format\s+(?:off|on)|(?:START|END)\s+KEVIN\s+CAA\s+WIZARD|(?:END\s+)?CAA2\s+WIZARD|KEVIN_SYSTEM_CODE\s+(?:START|END))\b/gm;
  for (const match of source.matchAll(marker)) {
    if (!locked.some(span => match.index! >= span.start && match.index! < span.end)) {
      warn(match.index!, "documentation skipped because a protection boundary is unmatched or unsupported");
      return { text, changed: false, warnings };
    }
  }
  for (const span of locked) warn(span.start, "protected region was not documented");

  let conditionalStart = -1;
  let conditionalDepth = 0;
  const directive = /^[ \t]*#[ \t]*([A-Za-z_]\w*)[^\n]*(?:\n|$)/gm;
  for (let match = directive.exec(masked); match; match = directive.exec(masked)) {
    const start = match.index;
    let end = start + match[0].length;
    while (source.slice(start, end).trimEnd().endsWith("\\") && end < source.length) {
      const next = source.indexOf("\n", end);
      end = next < 0 ? source.length : next + 1;
    }
    directive.lastIndex = end;
    directiveSpans.push({ start, end });
    const command = match[1];
    if (/^(?:if|ifdef|ifndef)$/.test(command)) {
      if (!conditionalDepth) conditionalStart = start;
      conditionalDepth += 1;
    } else if (command === "endif") {
      if (!conditionalDepth) {
        warn(start, "documentation skipped because a conditional directive is unmatched");
        return { text, changed: false, warnings };
      }
      conditionalDepth -= 1;
      if (!conditionalDepth) {
        protectedSpans.push({ start: conditionalStart, end });
        warn(conditionalStart, "conditional preprocessor region was not documented");
      }
    } else if (/^(?:else|elif)$/.test(command) && !conditionalDepth) {
      warn(start, "documentation skipped because a conditional directive is unmatched");
      return { text, changed: false, warnings };
    } else if (command !== "include" && !/^(?:else|elif)$/.test(command)) {
      protectedSpans.push({ start, end });
      warn(start, "preprocessor directive was preserved without documentation changes");
    }
  }
  if (conditionalDepth) {
    warn(conditionalStart, "documentation skipped because a conditional directive is unmatched");
    return { text, changed: false, warnings };
  }

  const code = maskSpans(masked, [...protectedSpans, ...directiveSpans]);
  const headerCode = options.headerText === undefined ? undefined : pnwMaskCppTrivia(options.headerText);
  const insertions: Array<{ offset: number; text: string }> = [];
  function visitScope(start: number, end: number): void {
    let boundary = start;
    let paren = 0;
    let square = 0;
    for (let i = start; i < end; i += 1) {
      if (code[i] === "(") paren += 1;
      if (code[i] === ")") paren -= 1;
      if (code[i] === "[") square += 1;
      if (code[i] === "]") square -= 1;
      if (paren < 0 || square < 0 || code[i] === "}") {
        warn(i, "remaining scope was not documented because its structure is ambiguous");
        return;
      }
      if (paren || square) continue;
      if (code[i] === ";") { boundary = i + 1; continue; }
      if (code[i] !== "{") continue;
      const close = closingBrace(code, i, end);
      if (close < 0) {
        warn(i, "remaining scope was not documented because a brace is unmatched");
        return;
      }
      const lead = code.slice(boundary, i);
      const first = lead.search(/\S/);
      const signatureStart = first < 0 ? i : boundary + first;
      const prefix = code.slice(signatureStart, i).trim();
      if (/^(?:inline\s+)?namespace(?:\s+[A-Za-z_]\w*(?:::[A-Za-z_]\w*)*)?$/.test(prefix)) {
        visitScope(i + 1, close);
      } else if (/^(?:class|struct|enum|union)\b/.test(prefix)) {
        // Class-local inline members are handled by the header workflow.
      } else {
        const identified = identifySignature(prefix);
        const insertionStart = source.lastIndexOf("\n", Math.max(0, signatureStart - 1)) + 1;
        if ([...protectedSpans, ...directiveSpans].some(span => signatureStart < span.end && close + 1 > span.start)) {
          warn(signatureStart, "definition was not documented because it overlaps protected or preprocessor content");
        } else if (!identified && !prefix.includes("(")) {
          // Braced global initializers are not function definitions.
        } else if (!identified || source.slice(insertionStart, signatureStart).trim()) {
          warn(signatureStart, "definition-like block was not documented because its signature is unsupported");
        } else if (pnwIsFunctionCommentExcluded(identified.name, identified.className)) {
          // Intentional exclusion needs no header context and must not block
          // documentation of independent ordinary functions in the same file.
        } else if (headerCode && new RegExp(`(?:^|[^A-Za-z0-9_])${identified.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\(`).test(headerCode)) {
          // Name-only matching deliberately favors avoiding duplicate comments
          // when overload or namespace ownership cannot be established safely.
        } else if (identified.qualified && headerCode === undefined) {
          warn(signatureStart, "qualified definition was not documented because header context is unavailable");
        } else {
          const precedingStart = [...directiveSpans, ...protectedSpans]
            .filter(span => span.start >= boundary && span.end <= insertionStart)
            .reduce((latest, span) => Math.max(latest, span.end), boundary);
          const leadingComments = source.slice(precedingStart, insertionStart)
            .replace(/^[ \t]*\/\/-+[ \t]*(?:\n|$)/gm, "");
          const hasComment = /\/[/\*]/.test(leadingComments);
          if (!hasComment) {
            const original = source.slice(insertionStart, i);
            const documented = pnwAddMissingFunctionComment(original, identified.name, identified.className);
            const added = documented.slice(0, documented.length - original.length);
            if (added) insertions.push({ offset: insertionStart, text: added });
          }
        }
      }
      i = close;
      boundary = close + 1;
    }
    if (paren || square) warn(boundary, "remaining scope was not documented because a signature is incomplete");
  }
  visitScope(0, code.length);
  let output = source;
  for (const insertion of insertions.sort((a, b) => b.offset - a.offset)) {
    output = output.slice(0, insertion.offset) + insertion.text + output.slice(insertion.offset);
  }
  if (!insertions.length) return { text, changed: false, warnings };
  output = eol === "\n" ? output : output.replace(/\n/g, eol);
  return { text: output, changed: output !== text, warnings };
}
