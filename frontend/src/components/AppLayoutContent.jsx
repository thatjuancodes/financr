import React from "react";
import LeftPanel from "./LeftPanel";
import ProjectionsView from "./ProjectionsView";
import RightPanel from "./RightPanel";
import { HomeDashboardMain, HomeDashboardSidebar } from "./HomeDashboardView";
import Button from "./ui/Button";

export default function AppLayoutContent({
  activeView,
  isCompactLayout,
  supportsModalForm,
  isFormModalOpen,
  modalButtonLabel,
  showDashboardSidebar,
  showInlineLeftPanel,
  leftPanelProps,
  homeSidebarProps,
  homeMainProps,
  accountsViewProps,
  projectionsViewProps,
  rightPanelProps,
  onOpenFormModal,
  onCloseFormModal,
}) {
  return (
    <>
      {isCompactLayout && supportsModalForm && (
        <div className="mobile-toolbar">
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="mobile-add-button"
            onClick={onOpenFormModal}
          >
            {modalButtonLabel}
          </Button>
        </div>
      )}

      <div className={`columns${isCompactLayout ? " compact" : ""}`}>
        {(showDashboardSidebar || showInlineLeftPanel) && (
          <div className="col-left">
            {showDashboardSidebar ? (
              <HomeDashboardSidebar {...homeSidebarProps} />
            ) : (
              <LeftPanel {...leftPanelProps} modalMode={false} />
            )}
          </div>
        )}

        <div className="col-right">
          {activeView === "balance" && <HomeDashboardMain {...homeMainProps} />}
          {activeView === "projections" ? (
            <ProjectionsView {...projectionsViewProps} />
          ) : (
            <RightPanel {...rightPanelProps} accountsViewProps={accountsViewProps} />
          )}
        </div>
      </div>

      {isCompactLayout && supportsModalForm && isFormModalOpen && (
        <div className="modal-backdrop" onClick={onCloseFormModal} role="presentation">
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={modalButtonLabel}
          >
            <div className="modal-header">
              <h2>{modalButtonLabel}</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="modal-close-button"
                onClick={onCloseFormModal}
                aria-label="Close modal"
              >
                ×
              </Button>
            </div>
            <LeftPanel {...leftPanelProps} modalMode />
          </div>
        </div>
      )}
    </>
  );
}
