import { useBrowser } from '@/features/browser/state/BrowserContext';
import Tab from './../Tab/Tab';
import './Tabs.css';

const Tabs = () => {
  const { tabs, activeTabId } = useBrowser();
  return (
    <div className="browser-tabs">
      {tabs.map((tab) => (
        <Tab key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
      ))}
    </div>
  );
};

export default Tabs;
