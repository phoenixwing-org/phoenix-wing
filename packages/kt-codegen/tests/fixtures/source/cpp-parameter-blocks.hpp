// outside-before
class KtCourseGuardItemParam {
  // START KEVIN CAA WIZARD SECTION KtCourseGuardItem PARAM DECLARATION

  // clang-format off

  // @app Kt Auto Code
  // @version 5.0.0, (2024)

  /**
   * @brief Machine ID
   * @author Kuntai
   * @date 2026-07-16
   * @note Machine identifier
   * @id 1
   */
  int MachineId;

  /**
   * @brief Guard Length
   * @author Kuntai
   * @date 2026-07-16
   * @note Length used by CAA and Qt
   * @id 2
   */
  double GuardLength;

  // clang-format on
  // END KEVIN CAA WIZARD SECTION KtCourseGuardItem PARAM DECLARATION
};

KtCourseGuardItemParam::KtCourseGuardItemParam()
  // START KEVIN CAA WIZARD SECTION KtCourseGuardItem PARAM CONSTRUCTOR

  // clang-format off
  : MachineId(0) // 1
  , GuardLength(25 * 0.001) // 2

// clang-format on
// END KEVIN CAA WIZARD SECTION KtCourseGuardItem PARAM CONSTRUCTOR
{
}

void KtCourseGuardItemParam::Clear()
{
  // START KEVIN CAA WIZARD SECTION KtCourseGuardItem PARAM DESTRUCTOR

  // clang-format off
  // MachineId = 0; // 1
  // GuardLength = 25 * 0.001; // 2

  // clang-format on
  // END KEVIN CAA WIZARD SECTION KtCourseGuardItem PARAM DESTRUCTOR
}

void KtCourseGuardItemParam::Copy(const KtCourseGuardItemParam &iOriginal)
{
  // START KEVIN CAA WIZARD SECTION KtCourseGuardItem PARAM EQUAL

  // clang-format off
  MachineId = iOriginal.MachineId; // 1
  GuardLength = iOriginal.GuardLength; // 2

  // clang-format on
  // END KEVIN CAA WIZARD SECTION KtCourseGuardItem PARAM EQUAL
}
// outside-after
