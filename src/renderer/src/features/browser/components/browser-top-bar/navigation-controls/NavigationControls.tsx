import { useBrowser } from "@/features/browser/state/BrowserProvider";
import IconButton from "@/shared/components/IconButton";
import { BackwardIcon, ForwardIcon } from "@/shared/components/icons";

import "./NavigationControls.css";

const BrowserNavigationControls = () => {
  const { activeTab, goBack, goForward } = useBrowser();
  const canGoBack = activeTab?.canGoBack ?? false;
  const canGoForward = activeTab?.canGoForward ?? false;

  const forwardClassName = [
    "browser-navigation-controls-button",
    "browser-navigation-controls-button--forward",
    !canGoForward && "browser-navigation-controls-button--forward--hide",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="browser-navigation-controls">
      <IconButton
        ariaLabel="Go back"
        className="browser-navigation-controls-button browser-navigation-controls-button--backward"
        onClick={() => void goBack()}
        disabled={!canGoBack}
      >
        <BackwardIcon />
      </IconButton>

      <IconButton
        ariaLabel="Go forward"
        className={forwardClassName}
        onClick={() => void goForward()}
        disabled={!canGoForward}
      >
        <ForwardIcon />
      </IconButton>
    </div>
  );
};

export default BrowserNavigationControls;
