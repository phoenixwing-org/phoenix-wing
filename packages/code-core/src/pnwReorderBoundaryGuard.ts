import { pnwMaskCppTrivia } from "./pnwCppSyntaxGuards.js";

type Boundary = { kind: string; opening: boolean; label: string; offset: number };

function commentBoundary(comment: string, offset: number): Boundary | undefined {
  const content = comment.slice(2).trim();
  let match = /^clang-format\s+(off|on)\s*(?:\/\/.*)?$/i.exec(content);
  if (match) return { kind: "clang-format", opening: match[1].toLowerCase() === "off", label: "", offset };
  match = /^(START|END)\s+KEVIN\s+CAA\s+WIZARD\s+SECTION\b(.*)$/i.exec(content);
  if (match) return { kind: "CAA Wizard", opening: match[1].toUpperCase() === "START", label: match[2].trim(), offset };
  match = /^(END\s+)?CAA2\s+WIZARD\b(.*)$/i.exec(content);
  if (match) return { kind: "CAA2 Wizard", opening: !match[1], label: match[2].trim(), offset };
  match = /^KEVIN_SYSTEM_CODE\s+(START|END)\b(.*)$/i.exec(content);
  if (match) return { kind: "system code", opening: match[1].toUpperCase() === "START", label: match[2].trim(), offset };
}

/** Validate protection boundaries before any regex-based source reconstruction. */
export function pnwReorderBoundaryWarnings(text: string, options: { rejectRawLiterals?: boolean } = {}): string[] {
  const source = text.replace(/\r\n|\r/g, "\n");
  const boundaries: Boundary[] = [];
  const warnings: string[] = [];
  const warn = (offset: number, reason: string) => warnings.push(`Line ${source.slice(0, offset).split("\n").length}: ${reason}`);
  // Match complete trivia tokens so marker-looking strings or block comments
  // never enter the protection stack. A raw opener fallback catches truncation.
  const trivia = /\b(?:u8|u|U|L)?R"([^ ()\\\t\r\n]{0,16})\([\s\S]*?\)\1"|\b(?:u8|u|U|L)?R"|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g;
  for (const match of source.matchAll(trivia)) {
    const token = match[0];
    const offset = match.index!;
    if (/^(?:u8|u|U|L)?R"/.test(token)) {
      if (options.rejectRawLiterals || /^(?:u8|u|U|L)?R"$/.test(token)) {
        warn(offset, "preserved source containing a raw string literal that this parser cannot safely reconstruct");
        return warnings;
      }
    } else if (token.startsWith("//") || token.startsWith("/*")) {
      const content = token.startsWith("//") ? token.slice(2).trim() : token.slice(2, -2).trim();
      // Clang also recognizes block comments and a colon followed by a reason.
      // The existing region extractor does not own those forms, so fail closed
      // until it can preserve their complete ranges rather than ignoring them.
      // https://clang.llvm.org/docs/ClangFormatStyleOptions.html#disabling-formatting-on-a-piece-of-code
      if (/^clang-format\s+(?:off|on)\b/i.test(content)
        && (token.startsWith("/*") || !/^clang-format\s+(?:off|on)\s*(?:\/\/.*)?$/i.test(content))) {
        warn(offset, "preserved source containing unsupported clang-format protection syntax");
        continue;
      }
      if (!token.startsWith("//")) continue;
      const boundary = commentBoundary(token, offset);
      if (!boundary) continue;
      const lineStart = source.lastIndexOf("\n", offset - 1) + 1;
      if (source.slice(lineStart, offset).trim()) {
        warn(offset, "preserved source containing a protection marker outside its own line");
      }
      boundaries.push(boundary);
    }
  }
  const code = pnwMaskCppTrivia(source);
  for (const match of code.matchAll(/^[ \t]*#[ \t]*pragma[ \t]+(region|endregion)\b([^\n]*)/gm)) {
    boundaries.push({ kind: "pragma region", opening: match[1] === "region", label: match[2].trim(), offset: match.index! });
  }
  const stacks = new Map<string, Boundary[]>();
  for (const boundary of boundaries.sort((a, b) => a.offset - b.offset)) {
    const stack = stacks.get(boundary.kind) ?? [];
    stacks.set(boundary.kind, stack);
    if (boundary.opening) {
      stack.push(boundary);
      continue;
    }
    const start = stack.pop();
    if (!start) {
      warn(boundary.offset, `preserved source because ${boundary.kind} has a closing boundary without an opening boundary`);
    } else if (boundary.label && start.label && boundary.label.replace(/\s+/g, " ") !== start.label.replace(/\s+/g, " ")) {
      warn(boundary.offset, `preserved source because ${boundary.kind} boundary labels are mismatched or incorrectly nested`);
    }
  }
  // Different protection kinds may overlap: the established locked-region
  // extractor merges their union. Same-kind nesting still obeys stack order.
  for (const [kind, stack] of stacks) {
    for (const start of stack) warn(start.offset, `preserved source because ${kind} has an opening boundary without a closing boundary`);
  }
  return warnings;
}
