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
    //.............................................................................
    // @key    CmdActionFia
    // @usage  put this code block into the function Cmd::ActionSelectorListFia()
    // @brief  Action object selected
    //.............................................................................
    // Field count = 1
    int count = 0;
    switch (field) {
    case Field_PNXBomAnalysis_FirstProduct:
        KT_AUTO_CMD_ACTION_FIA(FirstProduct);
        break;
    }

    // clang-format on
    // END KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD ACTION FIA
}

CATBoolean PNXBomAnalysisCmd::ActionSelectorListPda(void* data) {
    // START KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD ACTION PDA

    // clang-format off
    //.............................................................................
    // @key    CmdActionPda
    // @usage  put this code block into the function Cmd::ActionSelectorListPda()
    // @brief  InitializeAcquisition and HSO Append
    //.............................................................................
    // Field count = 1
    if (fieldChange) KT_AUTO_HSO_CLEAR();
    switch (field) {
    case Field_PNXBomAnalysis_FirstProduct:
        KT_AUTO_CMD_ACTION_PDA(FirstProduct);
        break;
    }

    // clang-format on
    // END KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD ACTION PDA
}

void PNXBomAnalysisCmd::fiaAgentClear() {
    // START KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD AGENT FIA CLEAR

    // clang-format off
    //.............................................................................
    // @key    CmdAgentFiaClear
    // @usage  put this code block into the function Cmd::fiaAgentClear()
    // @brief  clear select state
    //.............................................................................
    KT_AUTO_CMD_ACTION_FIA_CLEAR(FirstProduct);

    // clang-format on
    // END KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD AGENT FIA CLEAR
}

void PNXBomAnalysisCmd::fiaAgentUpdate() {
    // START KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD AGENT UPDATE STATE

    // clang-format off
    //.............................................................................
    // @key    CmdAgentUpdateState
    // @usage  put this code block into the function Cmd::fiaAgentUpdate()
    // @brief  Update select state
    //.............................................................................
    // Field count = 1
    switch (field) {
    case Field_PNXBomAnalysis_FirstProduct:
        KT_AUTO_CMD_AGENT_UPDATE_STATE(FirstProduct);
        break;
    case 0:
        KT_AUTO_CMD_AGENT_UPDATE_STATE_ERROR();
    }

    // clang-format on
    // END KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD AGENT UPDATE STATE
}

void PNXBomAnalysisCmd::SetActiveField(PNXBomAnalysisField field) {
    // START KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD SET ACTIVE FIELD

    // clang-format off
    //.............................................................................
    // @key    CmdSetActiveField
    // @usage  put this code block into the function Cmd::SetActiveField()
    // @brief  Set Active Field, clear other field, update select agent...
    //.............................................................................
    // Field count = 1

    KT_AUTO_HSO_CLEAR();
    switch (field) {
    case Field_PNXBomAnalysis_FirstProduct:
        KT_AUTO_HSO_ADD(FirstProduct);
        break;
    default:
        break;
    }

    // clang-format on
    // END KEVIN CAA WIZARD SECTION PNXBomAnalysis CMD SET ACTIVE FIELD
}
