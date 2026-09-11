import type TabState from "./TabState";
import IconButton from "@/shared/components/IconButton";
import { CloseIcon, MuteIcon, ReloadIcon } from "@/shared/icons";
import "./Tab.css";

interface TabProps {
  tab: TabState;
  isActive: boolean;
  onActivate: (tabId: string) => void;
  onClose: (tabId: string) => void;
}

const Tab = ({ tab, isActive, onActivate, onClose }: TabProps) => {
  const handleClick = () => {
    onActivate(tab.id);
  };
  const handleClose = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClose(tab.id);
  };
  return (
    <div
      className={`browser-tab ${isActive ? "browser-tab--active" : ""}`}
      onClick={handleClick}
    >
      <div className="browser-tab-info-container">
        <IconButton
          ariaLabel="closeTab"
          className="browser-tab-button--close"
          onClick={handleClose}
        >
          <CloseIcon size={15} />
        </IconButton>
        <span className="browser-tab-title">{tab.title || "New Tab"}</span>
      </div>
      <div className="browser-tab-indicator-container">
        <IconButton ariaLabel="reload" className="browser-tab-button--reload">
          <ReloadIcon size={17} />
        </IconButton>
        <IconButton ariaLabel="mute" className="browser-tab-button--mute">
          <MuteIcon size={17} />
        </IconButton>
      </div>
    </div>
  );
};

export default Tab;
