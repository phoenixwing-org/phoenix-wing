export interface PnwRunCaaVersionInput {
  readonly explicit?: string;
  readonly target?: string;
  readonly environment?: string;
  readonly suggested?: string;
}

export interface PnwRunCaaVersion {
  readonly value: string;
  readonly source: "explicit" | "target" | "environment" | "suggested";
}

export function pnwResolveRunCaaVersion(input: PnwRunCaaVersionInput): PnwRunCaaVersion {
  const candidates = [
    ["explicit", input.explicit],
    ["target", input.target],
    ["environment", input.environment],
    ["suggested", input.suggested ?? "19"],
  ] as const;
  for (const [source, rawValue] of candidates) {
    const value = rawValue?.trim();
    if (!value) continue;
    if (!/^[A-Za-z]?\d{2,4}$/u.test(value)) throw new Error(`Invalid CAA version: ${value}`);
    return { value: value.replace(/^[A-Za-z]/u, ""), source };
  }
  throw new Error("CAA version is unavailable");
}
