import IconButton from "@/shared/components/IconButton";
import { ForwardIcon, BackwardIcon } from "@/shared/icons";

import "./BrowserNavigationControls.css";

const BrowserNavigationControls = () => {
  const handleGoBack = async () => {
    try {
      const result = await window.browser.goBack();
      console.log("BrowserNavigationControls: go back result", result);

      if (!result.success) {
        console.error(
          "BrowserNavigationControls: failed to go back",
          result.error,
        );

        return;
      }

      console.log("BrowserNavigationControls: go back result", result.data);
    } catch (error) {
      console.error(
        "BrowserNavigationControls: unexpected error while going back",
        error,
      );
    }
  };

  const handleGoForward = async () => {
    try {
      const result = await window.browser.goForward();

      if (!result.success) {
        console.error(
          "BrowserNavigationControls: failed to go forward",
          result.error,
        );

        return;
      }

      console.log("BrowserNavigationControls: go forward result", result.data);
    } catch (error) {
      console.error(
        "BrowserNavigationControls: unexpected error while going forward",
        error,
      );
    }
  };

  return (
    <div className="browser-navigation-controls">
      <IconButton
        ariaLabel="Go back"
        className="browser-navigation-controls-button browser-navigation-controls-button--backward"
        onClick={handleGoBack}
      >
        <BackwardIcon />
      </IconButton>
      {
      }
      <IconButton
        ariaLabel="Go forward"
        className="browser-navigation-controls-button browser-navigation-controls-button--forward"
        onClick={handleGoForward}
      >
        <ForwardIcon />
      </IconButton>
    </div>
  );
};

export default BrowserNavigationControls;
