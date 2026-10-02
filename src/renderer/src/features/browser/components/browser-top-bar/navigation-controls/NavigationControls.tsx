import { useCallback, useState } from "react";
import { useBrowser } from "@/features/browser/state/BrowserProvider";
import IconButton from "@/shared/components/IconButton";
import { ForwardIcon, BackwardIcon } from "@/shared/components/icons";
import * as browserApi from "@/features/browser/api/browserApi";
import type { IPCResult } from "@/api/ipc.types";
import "./NavigationControls.css";

interface BrowserNavigationControlsProps {
  onError?: (error: Error) => void;
}

const BrowserNavigationControls = ({
  onError,
}: BrowserNavigationControlsProps) => {
  const { activeTab } = useBrowser();
  const canGoBack = activeTab?.canGoBack ?? false;
  const canGoForward = activeTab?.canGoForward ?? false;

  // Tracks which direction (if any) currently has a request in flight,
  // so a slow IPC round-trip can't be triggered again by repeated
  // clicks on the same button before the first resolves.
  const [pendingDirection, setPendingDirection] = useState<
    "back" | "forward" | null
  >(null);

  const runNavigationAction = useCallback(
    async (
      direction: "back" | "forward",
      action: () => Promise<IPCResult<boolean>>,
      label: string,
    ) => {
      if (pendingDirection) return;

      setPendingDirection(direction);
      try {
        const result = await action();
        if (!result.success) {
          const error = new Error(result.error.message || `Failed to ${label}`);
          console.error(
            `BrowserNavigationControls: failed to ${label}`,
            result.error,
          );
          onError?.(error);
        }
      } catch (error) {
        const normalized =
          error instanceof Error ? error : new Error(String(error));
        console.error(
          `BrowserNavigationControls: unexpected error while ${label}`,
          normalized,
        );
        onError?.(normalized);
      } finally {
        setPendingDirection(null);
      }
    },
    [pendingDirection, onError],
  );

  const handleGoBack = useCallback(() => {
    if (!canGoBack) return;
    return runNavigationAction("back", browserApi.goBack, "go back");
  }, [canGoBack, runNavigationAction]);

  const handleGoForward = useCallback(() => {
    if (!canGoForward) return;
    return runNavigationAction("forward", browserApi.goForward, "go forward");
  }, [canGoForward, runNavigationAction]);

  return (
    <div className="browser-navigation-controls">
      <IconButton
        ariaLabel="Go back"
        className="browser-navigation-controls-button browser-navigation-controls-button--backward"
        onClick={handleGoBack}
        disabled={!canGoBack || pendingDirection === "back"}
        aria-busy={pendingDirection === "back"}
      >
        <BackwardIcon />
      </IconButton>

      <IconButton
        ariaLabel="Go forward"
        className={`browser-navigation-controls-button browser-navigation-controls-button--forward ${
          canGoForward
            ? ""
            : "browser-navigation-controls-button--forward--hide"
        }`}
        onClick={handleGoForward}
        disabled={!canGoForward || pendingDirection === "forward"}
        aria-busy={pendingDirection === "forward"}
      >
        <ForwardIcon />
      </IconButton>
    </div>
  );
};

export default BrowserNavigationControls;
