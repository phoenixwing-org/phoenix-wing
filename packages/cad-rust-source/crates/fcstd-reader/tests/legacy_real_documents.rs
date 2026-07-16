//! Freezes the behavior copied from Desk Tools before parity fixes.
//! These assertions deliberately expose known gaps so a later fix is explicit.

#[test]
fn freezes_internal_assembly_legacy_mount_candidates() {
    let xml = include_str!("../../../fixtures/document-xml/内部装配示例-Document.xml");
    let document = fcstd_reader::xml::parse_document_xml(xml).unwrap();

    assert!(document.root_names.iter().any(|name| name == "PCB"));
    let first_legacy_bom_item = document
        .objects
        .iter()
        .find(|object| object.is_valid_bom_item)
        .map(|object| object.name.as_str());
    assert_eq!(first_legacy_bom_item, Some("Part__Feature025"));
}

#[test]
fn freezes_legacy_property_xlink_gap() {
    let xml = include_str!("../../../fixtures/document-xml/图纸-通过link来创建-Document.xml");
    let document = fcstd_reader::xml::parse_document_xml(xml).unwrap();

    assert!(document.objects.iter().any(|object| object.name == "Link"));
    assert!(document.xlinks.is_empty());
}
