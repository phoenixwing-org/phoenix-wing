namespace sample {
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

	// START KEVIN CAA WIZARD SECTION KtCourseGuardItem QT UPDATE DIALOG

	// clang-format off

	// 1, MachineId, Machine identifier
	dialogMore->spinBoxMachineId->setValue(parameter->MachineId);

	// 2, GuardLength, Length used by CAA and Qt
	dialogMore->doubleSpinBoxGuardLength->setValue(parameter->GuardLength);

	// clang-format on
	// END KEVIN CAA WIZARD SECTION KtCourseGuardItem QT UPDATE DIALOG
}
