import { useBrowser } from "@/features/browser/state/BrowserProvider";
import Tab from "./Tab";
import "./Tabs.css";
import { useEffect } from "react";

const Tabs = () => {
  const { tabs, activeTabId } = useBrowser();
  console.log("TABS:", tabs); // temporary

   useEffect(() => {
      console.log("RENDERER: setting up browser event listeners");
  
      const unsubscribeTabCreated = window.browser.onTabCreated((payload) => {
        console.log("🔥 TAB CREATED REACHED REACT:", payload);
      });
  
      const unsubscribeTabStateChanged = window.browser.onTabStateChanged(
        (payload) => {
          console.log("🔥 TAB STATE CHANGED REACHED REACT:", payload);
        },
      );
  
      const unsubscribeTabActivated = window.browser.onTabActivated((payload) => {
        console.log("🔥 TAB ACTIVATED REACHED REACT:", payload);
      });
  
      const unsubscribeTabClosed = window.browser.onTabClosed((payload) => {
        console.log("🔥 TAB CLOSED REACHED REACT:", payload);
      });
  
      return () => {
        console.log("RENDERER: cleaning up browser event listeners");
  
        unsubscribeTabCreated();
        unsubscribeTabStateChanged();
        unsubscribeTabActivated();
        unsubscribeTabClosed();
      };
    });
  

  if (tabs.length === 0) {
    return (
      <div
        className="browser-tabs browser-tabs--empty"
        role="tablist"
        aria-label="Browser tabs"
      >
        <span className="browser-tabs-empty-message">No open tabs</span>
      </div>
    );
  }

  return (
    <div className="browser-tabs" role="tablist" aria-label="Browser tabs">
      {tabs.map((tab) => (
        <Tab key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
      ))}
    </div>
  );
};

export default Tabs;
