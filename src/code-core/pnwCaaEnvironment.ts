export type PnwCaaEnvironmentKey = "customRoot" | "thirdPartyRoot" | "coreRoot" | "caaMkVersion";
export type PnwCaaEnvironmentSource = "workspace" | "system" | "missing";
export type PnwCaaEnvironmentValue = {
  readonly key: PnwCaaEnvironmentKey;
  readonly environmentVariable: "ROOT_DIR" | "ROOT_DIR_3rdParty" | "ROOT_DIR_CORE" | "CAA_MK_VERSION";
  readonly required: boolean;
  readonly source: PnwCaaEnvironmentSource;
  readonly value?: string;
  readonly suggestedValue?: string;
};
export type PnwCaaEnvironment = { readonly values: readonly PnwCaaEnvironmentValue[]; readonly complete: boolean };

/** Resolves explicit workspace overrides before inherited system values; it never mutates `process.env`. */
export function pnwResolveCaaEnvironment(
  system: Readonly<Record<string, string | undefined>>,
  workspaceOverrides: Partial<Record<PnwCaaEnvironmentKey, string | undefined>> = {},
): PnwCaaEnvironment {
  const definitions: readonly Pick<PnwCaaEnvironmentValue, "key" | "environmentVariable" | "required">[] = [
    { key: "customRoot", environmentVariable: "ROOT_DIR", required: true },
    { key: "thirdPartyRoot", environmentVariable: "ROOT_DIR_3rdParty", required: true },
    { key: "coreRoot", environmentVariable: "ROOT_DIR_CORE", required: true },
    { key: "caaMkVersion", environmentVariable: "CAA_MK_VERSION", required: false },
  ];
  const values: PnwCaaEnvironmentValue[] = definitions.map((definition): PnwCaaEnvironmentValue => {
    const override = workspaceOverrides[definition.key]?.trim();
    const inherited = system[definition.environmentVariable]?.trim();
    const value = override || inherited;
    const source: PnwCaaEnvironmentSource = value ? (override ? "workspace" : "system") : "missing";
    return {
      ...definition,
      source,
      ...(value ? { value } : {}),
      ...(!value && definition.key === "caaMkVersion" ? { suggestedValue: "19" } : {}),
    };
  });
  return { values, complete: values.filter((value) => value.required).every((value) => Boolean(value.value)) };
}
