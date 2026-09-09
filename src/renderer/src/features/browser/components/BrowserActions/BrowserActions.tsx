import IconButton from "@/shared/components/IconButton";
import { AddFolderIcon } from "@/shared/icons";

const BrowserActions = () => {
  return (
    <div className="browser-actions">
      <IconButton
        ariaLabel="New Tab"
        className="browser-action-button browser-action-button--backward"
      >
        <AddFolderIcon />
      </IconButton>

      <IconButton
        ariaLabel="Close Tab"
        className="browser-action-button browser-action-button---forward"
      >
        <AddFolderIcon />
      </IconButton>
    </div>
  );
};

export default BrowserActions;
