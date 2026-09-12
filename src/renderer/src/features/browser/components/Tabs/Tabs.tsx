import { useEffect, useState } from 'react';
import type { TabDTO } from '@/api/browser';
import Tab from './../Tab/Tab';
import './Tabs.css';

const Tabs = () => {
  const [tabs, setTabs] = useState<TabDTO[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeTabCreated = window.browser.onTabCreated((data) => {
      const { tab } = data;
      // Add Tab
      setTabs((currentTabs) => [...currentTabs, tab]);
    });
    const unsubscribeTabStateChanged = window.browser.onTabStateChanged(
      (data) => {
        console.log('unsubscribeTabStateChanged', data);
        const { tab, tabId } = data;
        setTabs((currentTabs) => {
          return currentTabs.map((t) =>
            t.id === tabId ? { ...t, ...tab } : t
          );
        });
      }
    );
    const unsubscribeTabActivated = window.browser.onTabActivated((data) => {
      const { tabId } = data;
      setActiveTabId(tabId);
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeTabCreated();
      unsubscribeTabStateChanged();
      unsubscribeTabActivated();
    };
  }, []);

  console.log('Tabs:', tabs);
  const handleActivateTab = async (tabId: string) => {
    try {
      const result = await window.browser.activateTab(tabId);

      if (!result.success) {
        console.error('Tabs: failed to activate tab', result.error);
        return;
      }
    } catch (error) {
      console.error('Tabs: unexpected error activating tab', error);
    }
  };

  const handleCloseTab = async (tabId: string) => {
    try {
      const result = await window.browser.closeTab(tabId);

      if (!result.success) {
        console.error('Tabs: failed to close tab', result.error);
        return;
      }

      setTabs((currentTabs) => currentTabs.filter((tab) => tab.id !== tabId));
    } catch (error) {
      console.error('Tabs: unexpected error closing tab', error);
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
