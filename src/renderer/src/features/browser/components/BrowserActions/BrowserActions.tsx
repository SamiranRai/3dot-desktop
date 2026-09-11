import IconButton from "@/shared/components/IconButton";
import { DownloadIcon, NewTabIcon } from "@/shared/icons";

import "./BrowserActions.css";

const BrowserActions = () => {
  const handleNewTabCreate = async () => {
    try {
      const result = await window.browser.createTab("http://www.google.com");

      if (!result.success) {
        console.error("BrowserActions: failed to create new tab", result.error);
        return;
      }

      console.log("BrowserActions: new tab created successfully");
    } catch (error) {
      console.error(
        "BrowserActions: unexpected error while creating new tab",
        error,
      );
    }
  };

  return (
    <div className="browser-actions">
      <IconButton
        ariaLabel="download"
        className="browser-action-button browser-action-button--download"
      >
        <DownloadIcon />
      </IconButton>

      <IconButton
        ariaLabel="newTab"
        className="browser-action-button browser-action-button--new-tab"
        onClick={handleNewTabCreate}
      >
        <NewTabIcon />
      </IconButton>
    </div>
  );
};

export default BrowserActions;
function useEffect(arg0: () => void) {
  throw new Error("Function not implemented.");
}
