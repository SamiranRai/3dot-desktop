import { BrowserProvider } from '@/features/browser/state/BrowserProvider';
import { BrowserActions } from '../browser-top-bar/actions';
import { BrowserNavigationControls } from '../browser-top-bar/navigation-controls';
import { SearchBar } from '../browser-top-bar/search-bar';
import Tabs from './browser-tab/Tabs';

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
