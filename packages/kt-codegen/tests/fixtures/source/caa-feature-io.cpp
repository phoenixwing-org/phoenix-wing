// outside-before
// START KEVIN CAA WIZARD SECTION KtCourseGuardItem IMPLEMENTS CPP GET

// clang-format off

//-----------------------------------------------
int KtECourseGuardItem::GetMachineId() const // 1
{
    int value(0);
    ktcSpecRW.GetValue("MachineId", value);
    return value;
}
//-----------------------------------------------
HRESULT KtECourseGuardItem::GetGuardLength(double& value) const // 2
{
    return ktcSpecRW.GetListValue("GuardLength", value);
}

// clang-format on
// END KEVIN CAA WIZARD SECTION KtCourseGuardItem IMPLEMENTS CPP GET

// START KEVIN CAA WIZARD SECTION KtCourseGuardItem IMPLEMENTS CPP SET

// clang-format off

//-----------------------------------------------
HRESULT KtECourseGuardItem::SetMachineId(const int& value, const CATBoolean& checkExist) // 1
{
    return ktcSpecRW.SetValue("MachineId", value, checkExist);
}
//-----------------------------------------------
HRESULT KtECourseGuardItem::SetGuardLength(const double& value, const CATBoolean& checkExist) // 2
{
    return ktcSpecRW.SetListValue("GuardLength", value, checkExist);
}

// clang-format on
// END KEVIN CAA WIZARD SECTION KtCourseGuardItem IMPLEMENTS CPP SET

// START KEVIN CAA WIZARD SECTION KtCourseGuardItem IMPLEMENTS PARAM GET

// clang-format off

value.MachineId = GetMachineId(); // 1
GetGuardLength(value.GuardLength); // 2

// clang-format on
// END KEVIN CAA WIZARD SECTION KtCourseGuardItem IMPLEMENTS PARAM GET

// START KEVIN CAA WIZARD SECTION KtCourseGuardItem IMPLEMENTS PARAM SET

// clang-format off

hr = SetMachineId(value.MachineId); // 1
if (FAILED(hr)) {
    msg.Append("\nSet Parameter of MachineId Error!");
    findError = TRUE;
}
hr = SetGuardLength(value.GuardLength); // 2
if (FAILED(hr)) {
    msg.Append("\nSet Parameter of GuardLength Error!");
    findError = TRUE;
}
if (findError) {
    SetErrMsg(msg);
    return E_FAIL;
}

// clang-format on
// END KEVIN CAA WIZARD SECTION KtCourseGuardItem IMPLEMENTS PARAM SET
// outside-after
