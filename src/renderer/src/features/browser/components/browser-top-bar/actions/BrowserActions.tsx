import { useCallback, useState } from "react";
import IconButton from "@/shared/components/IconButton";
import { DownloadIcon, NewTabIcon } from "@/shared/components/icons";
import { createTab, getTabs } from "@/features/browser/api/browserApi";

import "./BrowserActions.css";

const NEW_TAB_URL = "http://localhost:5173/start";

interface BrowserActionsProps {
  onDownloadClick?: () => void;
  onError?: (error: Error) => void;
}


const BrowserActions = ({ onDownloadClick, onError }: BrowserActionsProps) => {
  const [isCreatingTab, setIsCreatingTab] = useState(false);

  const handleNewTabCreate = useCallback(async () => {
    if (isCreatingTab) return;

    setIsCreatingTab(true);
    try {
      const result = await createTab(NEW_TAB_URL);
      if (!result.success) {
        const error = new Error(
          result.error.message || "Failed to create new tab",
        );
        console.error("BrowserActions: failed to create new tab", result.error);
        onError?.(error);
      }

      const tabs = await getTabs();
    } catch (error) {
      const normalized =
        error instanceof Error ? error : new Error(String(error));
      console.error(
        "BrowserActions: unexpected error while creating new tab",
        normalized,
      );
      onError?.(normalized);
    } finally {
      setIsCreatingTab(false);
    }
  }, [isCreatingTab, onError]);

  const handleDownloadClick = useCallback(() => {
    onDownloadClick?.();
  }, [onDownloadClick]);

  return (
    <div className="browser-actions">
      <IconButton
        ariaLabel="Download"
        className="browser-action-button browser-action-button--download"
        onClick={handleDownloadClick}
        disabled={!onDownloadClick}
      >
        <DownloadIcon />
      </IconButton>

      <IconButton
        ariaLabel="Open new tab"
        className="browser-action-button browser-action-button--new-tab"
        onClick={handleNewTabCreate}
        disabled={isCreatingTab}
        aria-busy={isCreatingTab}
      >
        <NewTabIcon />
      </IconButton>
    </div>
  );
};

export default BrowserActions;
