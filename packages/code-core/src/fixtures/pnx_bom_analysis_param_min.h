/**
 * Minimal excerpt from PNXBomAnalysisParam.h — Kevin Wizard END blank line + KEVIN_SYSTEM_CODE.
 * case_id=pnx-bom-param-min
 */
#ifndef PNXBomAnalysisParamMin_H
#define PNXBomAnalysisParamMin_H

class PNXBomAnalysisParamMin {
public:
    void setZebra();
    void getApple();

public:
    // START KEVIN CAA WIZARD SECTION PNXBomAnalysis PARAM DECLARATION

    // clang-format off

    // @app Kt Auto Code
    // @version 5.0.0, (2024)

    /**
     * @brief First Product
     * @author Phoenix
     * @date 2021/10/27
     * @id 1
     */
    CATISpecObject_var FirstProduct;

    /**
     * @brief Top Part Number
     * @author Phoenix
     * @date 2021/10/27
     * @id 2
     */
    CATUnicodeString FirstPartNumber;

    /**
     * @brief Part Count
     * @author Phoenix
     * @date 2025/10/13
     * @id 3
     */
    int PartCount;

    // clang-format on
    // END KEVIN CAA WIZARD SECTION PNXBomAnalysis PARAM DECLARATION

    std::vector<PNXBomItem>* productItems;

    /**
     * @brief Error Message List
     * @id 4
     */
    CATListOfCATUnicodeString errorMessage;

public: // KEVIN_SYSTEM_CODE
    // KEVIN_SYSTEM_CODE START
    static CATUnicodeString convertJson(const PNXBomItem& item);
    static int GetSoftwareVersion();
    // KEVIN_SYSTEM_CODE END

    CATUnicodeString ConvertErrorListToString() const;
};

#endif
