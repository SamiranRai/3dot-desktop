import { useBrowser } from "@/features/browser/state/BrowserProvider";

import Tab from "./Tab";
import "./Tabs.css";

const Tabs = () => {
  const { tabs, activeTabId } = useBrowser();

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
