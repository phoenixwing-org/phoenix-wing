// outside-before
class KtCourseGuardItemImpl {
  // START KEVIN CAA WIZARD SECTION KtCourseGuardItem IMPLEMENTS HEAD GET

  // clang-format off
public: // Get
  /**
   * @brief Machine ID
   * @return int
   * @author Kuntai
   * @date 2026-07-16
   * @note Machine identifier
   * @id 1
   */
  int GetMachineId() const;

  /**
   * @brief Guard Length
   * @return HRESULT
   * @author Kuntai
   * @date 2026-07-16
   * @note Length used by CAA and Qt
   * @id 2
   */
  HRESULT GetGuardLength(double& value) const;

  // clang-format on
  // END KEVIN CAA WIZARD SECTION KtCourseGuardItem IMPLEMENTS HEAD GET

  // START KEVIN CAA WIZARD SECTION KtCourseGuardItem IMPLEMENTS HEAD SET

  // clang-format off
public: // Set
  /**
   * @brief Machine ID
   * @param[in] value int
   * @return HRESULT
   * @author Kuntai
   * @date 2026-07-16
   * @note Machine identifier
   * @id 1
   */
  HRESULT SetMachineId(const int& value, const CATBoolean& checkExist = CATTrue);

  /**
   * @brief Guard Length
   * @param[in] value double
   * @return HRESULT
   * @author Kuntai
   * @date 2026-07-16
   * @note Length used by CAA and Qt
   * @id 2
   */
  HRESULT SetGuardLength(const double& value, const CATBoolean& checkExist = CATTrue);

  // clang-format on
  // END KEVIN CAA WIZARD SECTION KtCourseGuardItem IMPLEMENTS HEAD SET
};

class KtCourseGuardItemInterface {
  // START KEVIN CAA WIZARD SECTION KtCourseGuardItem INTERFACES HEAD GET

  // clang-format off
public: // Get
  /**
   * @brief Machine ID
   * @return int
   * @author Kuntai
   * @date 2026-07-16
   * @note Machine identifier
   * @id 1
   */
  virtual int GetMachineId() const = 0;

  /**
   * @brief Guard Length
   * @return HRESULT
   * @author Kuntai
   * @date 2026-07-16
   * @note Length used by CAA and Qt
   * @id 2
   */
  virtual HRESULT GetGuardLength(double& value) const = 0;

  // clang-format on
  // END KEVIN CAA WIZARD SECTION KtCourseGuardItem INTERFACES HEAD GET

  // START KEVIN CAA WIZARD SECTION KtCourseGuardItem INTERFACES HEAD SET

  // clang-format off
public: // Set
  /**
   * @brief Machine ID
   * @param[in] value int
   * @return HRESULT
   * @author Kuntai
   * @date 2026-07-16
   * @note Machine identifier
   * @id 1
   */
  virtual HRESULT SetMachineId(const int& value, const CATBoolean& checkExist = CATTrue) = 0;

  /**
   * @brief Guard Length
   * @param[in] value double
   * @return HRESULT
   * @author Kuntai
   * @date 2026-07-16
   * @note Length used by CAA and Qt
   * @id 2
   */
  virtual HRESULT SetGuardLength(const double& value, const CATBoolean& checkExist = CATTrue) = 0;

  // clang-format on
  // END KEVIN CAA WIZARD SECTION KtCourseGuardItem INTERFACES HEAD SET
};
// outside-after
