import { BrowserProvider } from '@/features/browser/state/BrowserContext';
import { BrowserActions } from './../BrowserActions';
import { BrowserNavigationControls } from './../BrowserNavigationControls';
import { SearchBar } from './../SearchBar';
import Tabs from './../Tabs/Tabs';

import './BrowserTopBar.css';

export default function BrowserTopBar() {
  return (
    <div className="browser-top-bar">
      <BrowserProvider>
        <BrowserNavigationControls />
        <SearchBar />
        <Tabs />
        <BrowserActions />
      </BrowserProvider>
    </div>
  );
}
