import { useEffect, useState } from "react";

import IconButton from "@/shared/components/IconButton";
import { ForwardIcon, BackwardIcon } from "@/shared/icons";
import type { TabDTO } from "@/api/browser";

import "./BrowserNavigationControls.css";

const BrowserNavigationControls = () => {
  const [activeTabState, setActiveTabState] = useState<TabDTO | null>(null);

  useEffect(() => {
    const unsubscribeTabActivated = window.browser.onTabActivated((data) => {
      setActiveTabState(data.state);
    });

    const unsubscribeTabStateChanged = window.browser.onTabStateChanged(
      (data) => {
        // Only update if this state belongs to the currently active tab.
        setActiveTabState((currentTab) => {
          if (!currentTab || currentTab.id !== data.tabId) {
            return currentTab;
          }

          return data.state;
        });
      },
    );

    return () => {
      unsubscribeTabActivated();
      unsubscribeTabStateChanged();
    };
  }, []);

  // const canGoBack = activeTab?.canGoBack ?? false;
  // const canGoForward = activeTab?.canGoForward ?? false;

  const handleGoBack = async () => {
    // if (!canGoBack) {
    //   return;
    // }

    try {
      const result = await window.browser.goBack();

      if (!result.success) {
        console.error(
          "BrowserNavigationControls: failed to go back",
          result.error,
        );
      }
    } catch (error) {
      console.error(
        "BrowserNavigationControls: unexpected error while going back",
        error,
      );
    }
  };

  const handleGoForward = async () => {
    // if (!canGoForward) {
    //   return;
    // }

    try {
      const result = await window.browser.goForward();

      if (!result.success) {
        console.error(
          "BrowserNavigationControls: failed to go forward",
          result.error,
        );
      }
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
        // disabled={!canGoBack}
      >
        <BackwardIcon />
      </IconButton>

      <IconButton
        ariaLabel="Go forward"
        className="browser-navigation-controls-button browser-navigation-controls-button--forward"
        onClick={handleGoForward}
        // disabled={!canGoForward}
      >
        <ForwardIcon />
      </IconButton>
    </div>
  );
};

export default BrowserNavigationControls;
