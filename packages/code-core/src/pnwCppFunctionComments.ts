import { pnwMaskCppTrivia } from "./pnwCppSyntaxGuards.js";

/** Lifecycle and assignment members keep their existing documentation only. */
export function pnwIsFunctionCommentExcluded(name: string, className: string): boolean {
  const normalizedName = name.replace(/\s+/g, "");
  return Boolean(className && (normalizedName === className || normalizedName === `~${className}`))
    || normalizedName === "operator=";
}

/** Add empty documentation only to an already identified function declaration. */
export function pnwAddMissingFunctionComment(text: string, name: string, className: string): string {
  if (pnwIsFunctionCommentExcluded(name, className)) return text;
  if (/^\s*\/[/\*]/.test(text)) return text;
  const masked = pnwMaskCppTrivia(text);
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/^operator/, "operator\\s*");
  const match = new RegExp(`(?<![A-Za-z_0-9])${escapedName}\\s*\\(`).exec(masked);
  if (!match) return text;
  const open = match.index + match[0].lastIndexOf("(");
  let depth = 1;
  let close = open + 1;
  for (; close < masked.length && depth; close += 1) {
    if (masked[close] === "(") depth += 1;
    if (masked[close] === ")") depth -= 1;
  }
  if (depth) return text;
  const parameters = splitParameters(masked.slice(open + 1, close - 1));
  const indent = text.match(/^[ \t]*/)?.[0] ?? "";
  const lines = ["/**", " * @brief"];
  for (const parameter of parameters) {
    const pointer = parameter.match(/\(\s*[*&]\s*([A-Za-z_]\w*)\s*\)/)?.[1];
    const named = parameter.match(/\b([A-Za-z_]\w*)\s*(?:\[[^\]]*\]\s*)*$/)?.[1];
    const candidate = pointer ?? named;
    if (!candidate || /^(?:void|bool|char|int|long|short|float|double|signed|unsigned|const|volatile|auto)$/.test(candidate)) continue;
    const prefix = parameter.slice(0, parameter.lastIndexOf(candidate)).trim();
    // An unnamed type such as `const Item` or `ns::Item` has no parameter name.
    if (!pointer && (!prefix || /::$/.test(prefix)
      || !prefix.replace(/\b(?:const|volatile|typename|class|struct|enum)\b/g, "").trim())) continue;
    lines.push(` * @param ${candidate}`);
  }
  const returnType = masked.slice(0, match.index)
    .replace(/(?:\b[A-Za-z_]\w*::)+\s*$/, "")
    .replace(/\b(?:static|inline|virtual|constexpr|consteval|explicit|friend)\b/g, "").trim();
  if (name !== className && name !== `~${className}` && returnType !== "void"
    && !/^\s*(?:const\s*)?(?:noexcept(?:\([^)]*\))?\s*)?->\s*void\b/.test(masked.slice(close))) lines.push(" * @return");
  lines.push(" */");
  return lines.map(line => `${indent}${line}\n`).join("") + text;
}

function splitParameters(text: string): string[] {
  const result: string[] = [];
  let angle = 0;
  let paren = 0;
  let square = 0;
  let brace = 0;
  let start = 0;
  let initializer = -1;
  for (let i = 0; i <= text.length; i += 1) {
    const ch = text[i];
    if (ch === "(") paren += 1;
    if (ch === ")") paren -= 1;
    if (ch === "[") square += 1;
    if (ch === "]") square -= 1;
    if (ch === "{") brace += 1;
    if (ch === "}") brace -= 1;
    if (!paren && !square && !brace) {
      // Comparison operators in a default argument are not template brackets.
      // A default template expression is normally parenthesized; an unbracketed
      // comma may be ambiguous, so no later parameter name is guessed below.
      if (ch === "<" && initializer < 0) angle += 1;
      if (ch === ">") angle = Math.max(0, angle - 1);
    }
    if (!angle && !paren && !square && !brace) {
      if (ch === "=" && initializer < 0) initializer = i;
      if (ch === "," || i === text.length) {
        result.push(text.slice(start, initializer < 0 ? i : initializer).trim());
        start = i + 1;
        initializer = -1;
      }
    }
  }
  return result;
}
