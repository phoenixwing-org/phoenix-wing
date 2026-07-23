/**
 * Minimal excerpt from PNXBomAnalysisCmd.cpp (PNX BOM Analysis CAA command).
 * Source: PNXBomAnalysisWsp/PNXBomAnalysisFrm/PNXBomAnalysisUI.m/src/PNXBomAnalysisCmd.cpp
 *
 * case_id=pnx-bom-cmd-min-pending
 * Status: fixture only — regression tests not wired yet.
 *
 * Intended later coverage:
 * - Kevin CAA Wizard blocks inside member function bodies (.cpp)
 * - Manual code between Wizard END and following statements
 * - Optional: #pragma region VirtualFunction (see doc — 待研究)
 */
#include "PNXBomAnalysisCmd.h"

//-----------------------------------------------------------------------------
CATBoolean PNXBomAnalysisCmd::ActionSelectorListPda(void* data) {
    int field = CATPtrToINT32(data);

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

    if (fieldChange) fiaAgentUpdate();

    return TRUE;
}
//-----------------------------------------------------------------------------
CATBoolean PNXBomAnalysisCmd::ActionSelectorListFia(void*) {
    if (NULL == _pfiaElementSelect) return CATFalse;

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

    AfterValueChange();
    return TRUE;
}
//-----------------------------------------------------------------------------
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
//-----------------------------------------------------------------------------
void PNXBomAnalysisCmd::fiaAgentUpdate() {
    fiaAgentClear();

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
//-----------------------------------------------------------------------------
CATBoolean PNXBomAnalysisCmd::ActionValueChange(void*) {
    daValueChange_->InitializeAcquisition();
    AfterValueChange();
    return TRUE;
}
