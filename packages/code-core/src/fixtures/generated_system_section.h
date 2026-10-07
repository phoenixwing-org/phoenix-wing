// Independently constructed: locked fields and legacy system-code markers.
class SampleParameters {
public:
    void setZebra();
    void getApple();
    // START KEVIN CAA WIZARD SECTION SampleParameters PARAM DECLARATION
    // clang-format off
    int fieldZ;
    int fieldA;
    // clang-format on
    // END KEVIN CAA WIZARD SECTION SampleParameters PARAM DECLARATION

public: // KEVIN_SYSTEM_CODE
    // KEVIN_SYSTEM_CODE START
    static int convertJson(int value);
    static int GetSoftwareVersion();
    // KEVIN_SYSTEM_CODE END
    int ConvertErrorListToString() const;
};
