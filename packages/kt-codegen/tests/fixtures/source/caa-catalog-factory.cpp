// outside-before
// START KEVIN CAA WIZARD SECTION KtCourseGuardItem CATALOG PARAMS

// clang-format off
// 1; 	Machine ID; Kuntai; 2026-07-16;	Machine identifier
item.SetValue("MachineId", Integer, In);
itemList.push_back(item);
// 2; 	Guard Length; Kuntai; 2026-07-16;	Length used by CAA and Qt
item.SetTKListValue("GuardLength", Real, InOut);
itemList.push_back(item);

// clang-format on
// END KEVIN CAA WIZARD SECTION KtCourseGuardItem CATALOG PARAMS

// START KEVIN CAA WIZARD SECTION KtCourseGuardItem FACTRY ON TREE

// clang-format off

// 1, MachineId, Machine identifier
发现错误,TCKKind应该是tk_specobject
spListParmName.Append("MachineId");
spListParm.Append(piParmFactory->CreateInteger("Machine Id", parameter->MachineId));
ListOnTree.Append(true);

// clang-format on
// END KEVIN CAA WIZARD SECTION KtCourseGuardItem FACTRY ON TREE
// outside-after
