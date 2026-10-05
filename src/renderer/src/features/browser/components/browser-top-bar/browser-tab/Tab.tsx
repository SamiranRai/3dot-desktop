import { useState, type KeyboardEvent, type MouseEvent } from "react";

import type { TabDTO } from "@/features/browser/api/browser.types";
import { useBrowser } from "@/features/browser/state/BrowserProvider";
import IconButton from "@/shared/components/IconButton";
import { CloseIcon } from "@/shared/components/icons";

import "./Tab.css";

interface TabProps {
  tab: TabDTO;
  isActive: boolean;
}

const Tab = ({ tab, isActive }: TabProps) => {
  const { activateTab, closeTab } = useBrowser();
  const [isClosing, setIsClosing] = useState(false);

  const title = tab.title || "New Tab";

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.target !== event.currentTarget) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void activateTab(tab.id);
    }
  };

  const handleClose = async (event: MouseEvent) => {
    event.stopPropagation();
    if (isClosing) return;

    setIsClosing(true);
    await closeTab(tab.id);
    setIsClosing(false);
  };

  return (
    <div
      className={`browser-tab ${isActive ? "browser-tab--active" : ""}`}
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
      onClick={() => void activateTab(tab.id)}
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
    </div>
  );
};

export default Tab;
