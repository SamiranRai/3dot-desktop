import { useBrowser } from '@/features/browser/state/BrowserContext';
import type { TabDTO } from '@/api/browser';
import IconButton from '@/shared/components/IconButton';
import { CloseIcon, MuteIcon, ReloadIcon } from '@/shared/icons';
import './Tab.css';

interface TabProps {
  tab: TabDTO;
  isActive: boolean;
}

const Tab = ({ tab, isActive }: TabProps) => {
  const { activateTab, closeTab } = useBrowser();

  const handleActivate = () => {
    activateTab(tab.id);
  };

  const handleClose = (event: React.MouseEvent) => {
    event.stopPropagation();

    closeTab(tab.id);
  };

  const handleReload = (event: React.MouseEvent) => {
    event.stopPropagation();
    // onReload(tab.id);
  };

  const handleToggleMute = (event: React.MouseEvent) => {
    event.stopPropagation();
    // onToggleMute(tab.id);
  };

  const title = tab.title || 'New Tab';

  return (
    <div
      className={`browser-tab ${isActive ? 'browser-tab--active' : ''}`}
      role="tab"
      aria-selected={isActive}
      onClick={handleActivate}
    >
      <div className="browser-tab-info-container">
        <IconButton
          ariaLabel={`Close ${title}`}
          className="browser-tab-button--close"
          onClick={handleClose}
        >
          <CloseIcon size={15} />
        </IconButton>

        <span className="browser-tab-title">{title}</span>
      </div>

      <div className="browser-tab-indicator-container">
        <IconButton
          ariaLabel={`Reload ${title}`}
          className="browser-tab-button--reload"
          onClick={handleReload}
        >
          <ReloadIcon size={17} />
        </IconButton>

        <IconButton
          ariaLabel={tab ? `Unmute ${title}` : `Mute ${title}`}
          className="browser-tab-button--mute"
          onClick={handleToggleMute}
        >
          <MuteIcon size={17} />
        </IconButton>
      </div>
    </div>
  );
};

export default Tab;
