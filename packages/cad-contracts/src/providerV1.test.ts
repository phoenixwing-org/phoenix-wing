import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pnwIsCadNativeProviderManifestV1 } from "./providerV1.js";

function provider(): Record<string, unknown> {
  return JSON.parse(readFileSync(
    new URL("../fixtures/native-provider-v1.json", import.meta.url),
    "utf8",
  )) as Record<string, unknown>;
}

describe("Phoenix CAD native provider manifest v1", () => {
  it("accepts the shared Desk Tools provider fixture", () => {
    expect(pnwIsCadNativeProviderManifestV1(provider())).toBe(true);
  });

  it.each([
    ["schema version", { schema_version: 2 }],
    ["empty provider", { provider_id: "" }],
    ["unsafe platform", { platform: "darwin/arm64" }],
  ])("rejects invalid %s", (_label, patch) => {
    expect(pnwIsCadNativeProviderManifestV1({ ...provider(), ...patch })).toBe(false);
  });

  it("rejects unsafe paths, hashes, schema identity and missing capabilities", () => {
    const pathTraversal = provider() as any;
    pathTraversal.tools["fcstd-read"].relative_path = "../fcstd-read";
    expect(pnwIsCadNativeProviderManifestV1(pathTraversal)).toBe(false);

    const hash = provider() as any;
    hash.workspace_schema.ddl_sha256 = "not-a-hash";
    expect(pnwIsCadNativeProviderManifestV1(hash)).toBe(false);

    const capability = provider() as any;
    capability.tools["fcstd-xlink"].capabilities = ["patch"];
    expect(pnwIsCadNativeProviderManifestV1(capability)).toBe(false);

    const querySchema = provider() as any;
    querySchema.database_query_protocol.schema.version = 12;
    expect(pnwIsCadNativeProviderManifestV1(querySchema)).toBe(false);

    const queryCapability = provider() as any;
    queryCapability.tools["fcstd-query"].capabilities = ["parts"];
    expect(pnwIsCadNativeProviderManifestV1(queryCapability)).toBe(false);
  });

  it("keeps query discovery optional for older provider v1 installations", () => {
    const legacy = provider() as any;
    delete legacy.database_query_protocol;
    delete legacy.tools["fcstd-query"];
    expect(pnwIsCadNativeProviderManifestV1(legacy)).toBe(true);
  });
});
