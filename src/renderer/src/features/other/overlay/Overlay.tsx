import IconButton from "@/shared/components/IconButton";
import { PopupIcon } from "@/shared/components/icons";
import "./Overlay.css";

const Overlay = () => {
  return (
    <div className="overlay">
      <div className="mode-switcher">
        <IconButton
          ariaLabel="Browser Mode"
          className={`mode-switcher-button mode-switcher-button--browser ${false ? "" : "mode-switcher-button--browser--active"}`}
        >
          <PopupIcon size={12} />
          Browse
        </IconButton>

        <IconButton
          ariaLabel="Agent Mode"
          className={`mode-switcher-button mode-switcher-button--agent ${
            true ? "" : "mode-switcher-button--agent--active"
          }`}
        >
          <PopupIcon size={12} />
          Agent
        </IconButton>
      </div>
    </div>
  );
};
export default Overlay;
