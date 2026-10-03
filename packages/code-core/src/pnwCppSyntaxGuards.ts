/** Preserve offsets/newlines while hiding comments and C++ string/character literals. */
export function pnwMaskCppTrivia(text: string): string {
  return text.replace(/\b(?:u8|u|U|L)?R"([^ ()\\\t\r\n]{0,16})\([\s\S]*?\)\1"|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g,
    value => value.replace(/[^\r\n]/g, " "));
}
