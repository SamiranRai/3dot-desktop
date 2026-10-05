import { useBrowser } from "@/features/browser/state/BrowserProvider";
import IconButton from "@/shared/components/IconButton";
import { DownloadIcon, NewTabIcon } from "@/shared/components/icons";

import "./BrowserActions.css";

interface BrowserActionsProps {
  onDownloadClick?: () => void;
}

const BrowserActions = ({ onDownloadClick }: BrowserActionsProps) => {
  const { createTab } = useBrowser();

  return (
    <div className="browser-actions">
      <IconButton
        ariaLabel="Download"
        className="browser-action-button browser-action-button--download"
        onClick={onDownloadClick}
        disabled={!onDownloadClick}
      >
        <DownloadIcon />
      </IconButton>

      <IconButton
        ariaLabel="Open new tab"
        className="browser-action-button browser-action-button--new-tab"
        onClick={() => void createTab()}
      >
        <NewTabIcon />
      </IconButton>
    </div>
  );
};

export default BrowserActions;
