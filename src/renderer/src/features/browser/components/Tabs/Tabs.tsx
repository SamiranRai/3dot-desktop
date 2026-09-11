import { useEffect, useState } from "react";
import type TabState from "../Tab/TabState";
import "./Tabs.css";
import Tab from "../Tab/Tab";

const Tabs = () => {
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = window.browser.onTabCreated((tab) => {
      console.log("React: received new tab", tab);

      setTabs((currentTabs) => [...currentTabs, tab]);
    });

    return unsubscribe;
  }, []);

  const handleActivateTab = async (tabId: string) => {
    try {
      const result = await window.browser.activateTab(tabId);

      if (!result.success) {
        console.error("Tabs: failed to activate tab", result.error);

        return;
      }

      setActiveTabId(tabId);
    } catch (error) {
      console.error("Tabs: unexpected error activating tab", error);
    }
  };

  const handleCloseTab = async (tabId: string) => {
    try {
      const result = await window.browser.closeTab(tabId);

      if (!result.success) {
        console.error("Tabs: failed to closing tab", result.error);

        return;
      }

      setTabs((currentTabs) => currentTabs.filter((tab) => tab.id !== tabId));

      if (activeTabId === tabId) {
        setActiveTabId(tabId);
      }
    } catch (error) {
      console.error("Tabs: unexpected error closing tab", error);
    }
  };

  return (
    <div className="browser-tabs">
      {tabs.map((tab) => (
        <Tab
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onActivate={handleActivateTab}
          onClose={handleCloseTab}
        />
      ))}
    </div>
  );
};

export default Tabs;
