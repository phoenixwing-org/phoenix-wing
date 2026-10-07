// Independently constructed: system declarations span two public sections.
class SampleSplit {
public: // KEVIN_SYSTEM_CODE
    // KEVIN_SYSTEM_CODE START
    /** @note KEVIN_SYSTEM_CODE */
    static int GetSoftwareVersion();
    // KEVIN_SYSTEM_CODE END
public: // functions
    static int convertJson(int value);
    /** @note KEVIN_SYSTEM_CODE */
    int ConvertErrorListToString() const;
    void unrelatedHelper();
};
