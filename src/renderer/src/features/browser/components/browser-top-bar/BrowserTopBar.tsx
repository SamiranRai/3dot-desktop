import { BrowserProvider } from '@/features/browser/state/BrowserProvider';
import { BrowserActions } from './actions';
import { BrowserNavigationControls } from './navigation-controls';
import { SearchBar } from './search-bar';
import { Tabs } from './browser-tab';

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
