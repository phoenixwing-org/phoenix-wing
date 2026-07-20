import { describe, expect, it } from "vitest";
import {
  pnwComposeBomLabel,
  pnwComposeRecommendedBomFilename,
  pnwCadXlinkRuleLabel,
  pnwBuildAssemblyTreeFromXrefs,
  pnwInferBomDocumentKinds,
  pnwInferBomFieldsFromFilename,
  pnwExtractEmbeddedBomFieldsFromDocumentXml,
  pnwPatchEmbeddedBomFieldsInDocumentXml,
  pnwExtractXlinksFromDocumentXml,
  pnwNormalizeCadRelativePath,
  pnwResolveXlinkTarget,
  pnwResolveIncomingXlinkHosts,
} from "./index.js";

describe("CAD BOM filename core", () => {
  it("preserves the Desk Tools filename inference baseline", () => {
    expect(pnwInferBomFieldsFromFilename("parts/100003.002-S-M6X12Bolt.FCStd")).toEqual({
      repo_rel_path: "parts/100003.002-S-M6X12Bolt.FCStd",
      filename: "100003.002-S-M6X12Bolt.FCStd",
      PartNumber: "100003",
      PartVersion: "002",
      TypeCode: "S",
      ModelSeries: "",
      PartName: "M6X12Bolt",
      label: "100003.002-M6X12Bolt",
    });
  });

  it("recognizes part, assembly, and drawing suffixes", () => {
    expect(pnwInferBomDocumentKinds("asm/Widget.ASSY.FCStd")).toMatchObject({
      part: false,
      assembly: true,
      drawing: false,
      display: "Assembly",
      recommended_suffix: ".ASSY.FCStd",
    });
    expect(pnwInferBomDocumentKinds("draw/Widget.Drawing.FCStd")).toMatchObject({
      drawing: true,
      display: "Drawing",
      recommended_suffix: ".Drawing.FCStd",
    });
    expect(pnwInferBomDocumentKinds("parts/Widget.FCStd")).toMatchObject({ part: true, display: "Part" });
  });

  it("composes labels and filenames with the special S type rule", () => {
    const fields = {
      PartNumber: "200001",
      PartVersion: "001",
      TypeCode: "s",
      ModelSeries: "ignored",
      PartName: "Bolt",
    };
    expect(pnwComposeBomLabel(fields)).toBe("200001.001-Bolt");
    expect(pnwComposeRecommendedBomFilename(fields, ".ASSY.FCStd"))
      .toBe("200001.001-S-Bolt.ASSY.FCStd");
  });

  it("normalizes separators and rejects paths outside a workspace", () => {
    expect(pnwNormalizeCadRelativePath(".\\parts\\Bolt.FCStd")).toBe("parts/Bolt.FCStd");
    expect(() => pnwNormalizeCadRelativePath("../Bolt.FCStd")).toThrow(/Invalid workspace relative path/);
    expect(() => pnwNormalizeCadRelativePath("C:/parts/Bolt.FCStd")).toThrow(/Invalid workspace relative path/);
  });
});

describe("CAD XLink XML core", () => {
  it("extracts FCStd references and prefers the enclosing object label", () => {
    const xml = `<Document>
      <Object name="Link001">
        <Property name="Label"><String value="装配 &amp; 标签" /></Property>
        <XLink file="parts/100.001-H-Part.FCStd" label="Fallback" />
      </Object>
      <XLink file="parts/100.001-H-Part.FCStd" />
      <XLink file="other/200.001-S-Bolt.fcstd" label="Bolt &quot;A&quot;" />
      <XLink file="notes/readme.txt" label="Ignore" />
    </Document>`;
    expect(pnwExtractXlinksFromDocumentXml(xml)).toEqual([
      { file: "parts/100.001-H-Part.FCStd", label: "装配 & 标签" },
      { file: "other/200.001-S-Bolt.fcstd", label: "Bolt \"A\"" },
    ]);
  });

  it("fills a missing duplicate label without duplicating the edge", () => {
    expect(pnwExtractXlinksFromDocumentXml(
      `<Document><XLink file='part.FCStd'/><XLink file='part.FCStd' label='Part &#49;'/></Document>`,
    )).toEqual([{ file: "part.FCStd", label: "Part 1" }]);
  });
});

describe("CAD embedded BOM XML core", () => {
  it("extracts BOM fields from the legacy inline-type schema", () => {
    const xml = `<Document><ObjectData>
      <Object name="Assembly" type="App::Part"><Properties>
        <Property name="Label" type="App::PropertyString"><String value="主装配 &amp; 夹具"/></Property>
        <Property name="PartNumber" type="App::PropertyString"><String value="800001"/></Property>
        <Property name="PartVersion" type="App::PropertyString"><String value="002"/></Property>
        <Property name="TypeCode" type="App::PropertyString"><String value="a"/></Property>
        <Property name="ModelSeries" type="App::PropertyString"><String value="px"/></Property>
        <Property name="PartName" type="App::PropertyString"><String value="滑轨"/></Property>
        <Property name="Group" type="App::PropertyLinkList"><Link value="Body"/></Property>
      </Properties></Object>
      <Object name="Body" type="PartDesign::Body"><Properties>
        <Property name="Label"><String value="子项"/></Property>
      </Properties></Object>
    </ObjectData></Document>`;

    expect(pnwExtractEmbeddedBomFieldsFromDocumentXml(xml)).toEqual({
      PartNumber: "800001",
      PartVersion: "002",
      TypeCode: "A",
      ModelSeries: "PX",
      PartName: "滑轨",
      label: "主装配 & 夹具",
    });
  });

  it("uses the FreeCAD 1.x Objects type map and preserves empty fields", () => {
    const xml = `<Document>
      <Objects><Object type="PartDesign::Body" name="Body"/></Objects>
      <ObjectData><Object name="Body"><Properties>
        <Property name="Label" type="App::PropertyString"><String>新格式零件</String></Property>
        <Property name="PartNumber" type="App::PropertyString"><String value="900001"/></Property>
        <Property name="PartVersion" type="App::PropertyString"><String value="001"/></Property>
        <Property name="PartName" type="App::PropertyString"><String value=""/></Property>
      </Properties></Object></ObjectData>
    </Document>`;

    expect(pnwExtractEmbeddedBomFieldsFromDocumentXml(xml)).toEqual({
      PartNumber: "900001",
      PartVersion: "001",
      TypeCode: "",
      ModelSeries: "",
      PartName: "",
      label: "新格式零件",
    });
  });

  it("returns null when no root BOM object exists", () => {
    expect(pnwExtractEmbeddedBomFieldsFromDocumentXml(
      `<Document><ObjectData><Object name="Link" type="App::Link"><Properties/></Object></ObjectData></Document>`,
    )).toBeNull();
  });

  it("patches existing and missing BOM properties without touching sibling objects", () => {
    const xml = `<Document><ObjectData>
      <Object name="Root" type="App::Part"><Properties>
        <Property name="Label" type="App::PropertyString"><String value="Old"/></Property>
        <Property name="Custom"><String value="Keep"/></Property>
        <Property name="Group"><Link value="Child"/></Property>
      </Properties></Object>
      <Object name="Child" type="PartDesign::Body"><Properties>
        <Property name="Label"><String value="Child Label"/></Property>
      </Properties></Object>
    </ObjectData></Document>`;
    const patched = pnwPatchEmbeddedBomFieldsInDocumentXml(xml, {
      PartNumber: "800001",
      PartVersion: "002",
      PartName: "A&B",
      label: "New Root",
    });

    expect(patched).toMatchObject({ changed: true, objectName: "Root" });
    expect(patched?.xml).toContain('<Property name="Custom"><String value="Keep"/></Property>');
    expect(patched?.xml).toContain('<String value="A&amp;B"/>');
    expect(patched?.xml).toContain('<Object name="Child" type="PartDesign::Body"><Properties>');
    expect(pnwExtractEmbeddedBomFieldsFromDocumentXml(patched!.xml)).toMatchObject({
      PartNumber: "800001",
      PartVersion: "002",
      PartName: "A&B",
      label: "New Root",
    });
  });
});

describe("CAD XLink target resolution core", () => {
  it("handles direct, self, non-FCStd, and missing targets", () => {
    expect(pnwResolveXlinkTarget({
      hostRel: "./asm/Root.FCStd",
      xlinkFile: "../parts/Bolt.FCStd",
      candidateRels: [],
      existingCandidateRels: [],
      directTargetRel: "./parts/Bolt.FCStd",
    })).toEqual({ targetRel: "./parts/Bolt.FCStd", status: "resolved", candidates: [] });
    expect(pnwResolveXlinkTarget({
      hostRel: "./asm/Root.FCStd",
      xlinkFile: "Root.FCStd",
      candidateRels: ["./asm/Root.FCStd"],
      existingCandidateRels: ["./asm/Root.FCStd"],
      directTargetRel: "./asm/Root.FCStd",
    }).status).toBe("self");
    expect(pnwResolveXlinkTarget({
      hostRel: "./asm/Root.FCStd",
      xlinkFile: "notes.txt",
      candidateRels: [],
      existingCandidateRels: [],
    }).status).toBe("non_fcstd");
    expect(pnwResolveXlinkTarget({
      hostRel: "./asm/Root.FCStd",
      xlinkFile: "Missing.FCStd",
      candidateRels: ["./old/Missing.FCStd"],
      existingCandidateRels: [],
    })).toEqual({ targetRel: null, status: "missing", candidates: ["./old/Missing.FCStd"] });
  });

  it("prefers current directory, project version, then the shortest ambiguous path", () => {
    expect(pnwResolveXlinkTarget({
      hostRel: "./FreeCAD/Root.FCStd",
      xlinkFile: "Part.FCStd",
      candidateRels: ["./archive/Part.FCStd", "./FreeCAD/Part.FCStd"],
      existingCandidateRels: ["./archive/Part.FCStd", "./FreeCAD/Part.FCStd"],
    })).toEqual({ targetRel: "./FreeCAD/Part.FCStd", status: "resolved", candidates: [] });
    expect(pnwResolveXlinkTarget({
      hostRel: "./projects/Machine123/asm/Root.FCStd",
      xlinkFile: "Part.FCStd",
      candidateRels: ["./library/Part.001-A.FCStd", "./library/Part.123-A.FCStd"],
      existingCandidateRels: ["./library/Part.001-A.FCStd", "./library/Part.123-A.FCStd"],
    })).toEqual({ targetRel: "./library/Part.123-A.FCStd", status: "resolved", candidates: [] });
    expect(pnwResolveXlinkTarget({
      hostRel: "./asm/deep/Root.FCStd",
      xlinkFile: "Part.FCStd",
      candidateRels: ["./far/away/Part.FCStd", "./asm/Part.FCStd"],
      existingCandidateRels: ["./far/away/Part.FCStd", "./asm/Part.FCStd"],
    })).toEqual({
      targetRel: "./asm/Part.FCStd",
      status: "ambiguous",
      candidates: ["./asm/Part.FCStd", "./far/away/Part.FCStd"],
    });
  });

  it("composes reference labels from asset metadata then filename", () => {
    expect(pnwCadXlinkRuleLabel({ label: "明确标签" }, "Part.FCStd", null)).toBe("明确标签");
    expect(pnwCadXlinkRuleLabel({
      part_number: "8008",
      part_version: "001",
      part_name: "内部装配",
    }, "Part.FCStd", null)).toBe("8008.001-内部装配");
    expect(pnwCadXlinkRuleLabel(undefined, "Part.ASSY.FCStd", null)).toBe("Part");
  });
});

describe("CAD reference graph core", () => {
  const edges = [
    {
      host_repo_rel_path: "./asm/Root.FCStd",
      target_repo_rel_path: "./asm/Sub.ASSY.FCStd",
      resolve_status: "resolved",
      xlink_file_attr: "Sub.ASSY.FCStd",
      target_basename: "Sub.ASSY.FCStd",
      target_part_number: "100",
      target_part_version: "001",
      target_part_name: "Sub",
      link_label: "Sub Link",
      rule_label: "100.001-Sub",
    },
    {
      host_repo_rel_path: "./asm/Sub.ASSY.FCStd",
      target_repo_rel_path: "./parts/Bolt.FCStd",
      resolve_status: "ambiguous",
      xlink_file_attr: "../parts/Bolt.FCStd",
      target_basename: "Bolt.FCStd",
      target_part_number: "200",
      target_part_version: "002",
      target_part_name: "Bolt",
    },
    {
      host_repo_rel_path: "./parts/Bolt.FCStd",
      target_repo_rel_path: "./asm/Root.FCStd",
      resolve_status: "resolved",
      xlink_file_attr: "../asm/Root.FCStd",
      target_basename: "Root.FCStd",
    },
    {
      host_repo_rel_path: "./ignored.FCStd",
      target_repo_rel_path: "./parts/Bolt.FCStd",
      resolve_status: "missing",
      xlink_file_attr: "Bolt.FCStd",
    },
  ];

  it("resolves direct and transitive incoming hosts with cycles bounded", () => {
    const directRefs = [edges[1]];
    expect(pnwResolveIncomingXlinkHosts(
      edges,
      directRefs,
      new Set(["./parts/Bolt.FCStd"]),
      false,
      10,
    )).toEqual([expect.objectContaining({
      host_repo_rel_path: "./asm/Sub.ASSY.FCStd",
      depth: 0,
      usage_kind: "direct",
      direct_refs: directRefs,
    })]);
    expect(pnwResolveIncomingXlinkHosts(
      edges,
      directRefs,
      new Set(["./parts/Bolt.FCStd"]),
      true,
      10,
    ).map(({ host_repo_rel_path, depth, usage_kind, via_chain }) => ({
      host_repo_rel_path, depth, usage_kind, via_chain,
    }))).toEqual([
      { host_repo_rel_path: "./asm/Sub.ASSY.FCStd", depth: 0, usage_kind: "direct", via_chain: [] },
      { host_repo_rel_path: "./asm/Root.FCStd", depth: 1, usage_kind: "indirect", via_chain: ["./asm/Sub.ASSY.FCStd"] },
      { host_repo_rel_path: "./parts/Bolt.FCStd", depth: 2, usage_kind: "indirect", via_chain: ["./asm/Root.FCStd", "./asm/Sub.ASSY.FCStd"] },
    ]);
  });

  it("builds first-level and recursive assembly trees without recursing cycles", () => {
    const first = pnwBuildAssemblyTreeFromXrefs(edges, "./asm/Root.FCStd", false);
    expect(first.node_count).toBe(1);
    expect(first.nodes[0]).toMatchObject({
      repo_rel_path: "./asm/Sub.ASSY.FCStd",
      part_key: "100.001",
      file_role: "assembly",
      children: [],
    });

    const full = pnwBuildAssemblyTreeFromXrefs(edges, "./asm/Root.FCStd", true);
    expect(full.node_count).toBe(3);
    expect(full.nodes[0].children[0]).toMatchObject({
      repo_rel_path: "./parts/Bolt.FCStd",
      part_key: "200.002",
      file_role: "part",
    });
    expect(full.nodes[0].children[0].children[0]).toMatchObject({
      repo_rel_path: "./asm/Root.FCStd",
      children: [],
    });
  });
});
