PNXBomAnalysisCmd::PNXBomAnalysisCmd()
    : CATMMUIPanelStateCmd("PNXBomAnalysisCommand")

    // START KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD AGENT CONSTRUCTOR
    , KT_AUTO_CMD_AGENT_CONSTRUCTOR_COMMON()

// This handwritten constructor code must never become part of a replacement region.
{
    parameter = new PNXBomAnalysisParam();
}

PNXBomAnalysisCmd::~PNXBomAnalysisCmd() {
    featurePrevious_ = NULL_var;

    // START KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD AGENT DESTRUCTOR
    catFrmEditor_ = NULL;
}

// This handwritten code after the second missing End must also remain outside regions.
void PNXBomAnalysisCmd::BuildGraph() {
    dialog->UpdateDialog();
}

CATBoolean PNXBomAnalysisCmd::ActionSelectorListFia(void*) {
    // START KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD ACTION FIA
    // clang-format off
    int count = 0;
    // clang-format on
    // END KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD ACTION FIA
}

CATBoolean PNXBomAnalysisCmd::ActionSelectorListPda(void* data) {
    // START KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD ACTION PDA
    // clang-format off
    // Field count = 0
    // clang-format on
    // END KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD ACTION PDA
}

void PNXBomAnalysisCmd::fiaAgentClear() {
    // START KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD AGENT FIA CLEAR
    // clang-format off
    // clang-format on
    // END KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD AGENT FIA CLEAR
}

void PNXBomAnalysisCmd::fiaAgentUpdate() {
    // START KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD AGENT UPDATE STATE
    // clang-format off
    // Field count = 0
    // clang-format on
    // END KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD AGENT UPDATE STATE
}

void PNXBomAnalysisCmd::SetActiveField(PNXBomAnalysisField field) {
    // START KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD SET ACTIVE FIELD
    // clang-format off
    KT_AUTO_HSO_CLEAR();
    // clang-format on
    // END KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD SET ACTIVE FIELD
}
