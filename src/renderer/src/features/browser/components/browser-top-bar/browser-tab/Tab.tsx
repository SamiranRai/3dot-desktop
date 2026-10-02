// components/browser-tab/Tab.tsx
import { useCallback, useState } from "react";
import { useBrowser } from "@/features/browser/state/BrowserProvider";
import type { TabDTO } from "@/features/browser/api/browser.types";
import IconButton from "@/shared/components/IconButton";
import { CloseIcon, ReloadIcon } from "@/shared/components/icons";
import "./Tab.css";

interface TabProps {
  tab: TabDTO;
  isActive: boolean;
}

const Tab = ({ tab, isActive }: TabProps) => {
  const { activateTab, closeTab } = useBrowser();
  const [isClosing, setIsClosing] = useState(false);

  const title = tab.title || "New Tab";

  const handleActivate = useCallback(() => {
    activateTab(tab.id);
  }, [activateTab, tab.id]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleActivate();
      }
    },
    [handleActivate],
  );

  const handleClose = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (isClosing) return;

      setIsClosing(true);
      closeTab(tab.id).finally(() => setIsClosing(false));
    },
    [closeTab, tab.id, isClosing],
  );

  const handleReload = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    // TODO: no per-tab reload IPC method exists yet — BrowserAPI.reload()
    // only reloads the active tab. Wire this once that's added.
  }, []);

  return (
    <div
      className={`browser-tab ${isActive ? "browser-tab--active" : ""}`}
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
    >
      <div className="browser-tab-info-container">
        <IconButton
          ariaLabel={`Close ${title}`}
          className="browser-tab-button--close"
          onClick={handleClose}
          disabled={isClosing}
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
          disabled
        >
          <ReloadIcon size={17} />
        </IconButton>
      </div>
    </div>
  );
};

export default Tab;
