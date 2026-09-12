import { useBrowser } from '@/features/browser/state/BrowserContext';
import IconButton from '@/shared/components/IconButton';
import { ForwardIcon, BackwardIcon } from '@/shared/icons';
import './BrowserNavigationControls.css';

const BrowserNavigationControls = () => {
  const { activeTab } = useBrowser();
  const canGoBack = activeTab?.canGoBack ?? false;
  const canGoForward = activeTab?.canGoForward ?? false;
  const handleGoBack = async () => {
    if (!canGoBack) {
      return;
    }
    try {
      const result = await window.browser.goBack();
      if (!result.success) {
        console.error(
          'BrowserNavigationControls: failed to go back',
          result.error
        );
      }
    } catch (error) {
      console.error(
        'BrowserNavigationControls: unexpected error while going back',
        error
      );
    }
  };

  const handleGoForward = async () => {
    if (!canGoForward) {
      return;
    }
    try {
      const result = await window.browser.goForward();
      if (!result.success) {
        console.error(
          'BrowserNavigationControls: failed to go forward',
          result.error
        );
      }
    } catch (error) {
      console.error(
        'BrowserNavigationControls: unexpected error while going forward',
        error
      );
    }
  };

  return (
    <div className="browser-navigation-controls">
      <IconButton
        ariaLabel="Go back"
        className="browser-navigation-controls-button browser-navigation-controls-button--backward"
        onClick={handleGoBack}
        disabled={!canGoBack}
      >
        <BackwardIcon />
      </IconButton>

      <IconButton
        ariaLabel="Go forward"
        className={`browser-navigation-controls-button browser-navigation-controls-button--forward ${canGoForward ? '' : 'browser-navigation-controls-button--forward--hide'}`}
        onClick={handleGoForward}
        disabled={!canGoForward}
      >
        <ForwardIcon />
      </IconButton>
    </div>
  );
};

export default BrowserNavigationControls;
