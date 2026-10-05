import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { START_URL } from "@/features/browser/browser.constants";
import { useBrowser } from "@/features/browser/state/BrowserProvider";
import IconButton from "@/shared/components/IconButton";
import { ReloadIcon, SearchIcon } from "@/shared/components/icons";

import "./SearchBar.css";

function getDisplayValue(url: string): string {
  if (!url || url === START_URL) return "";

  try {
    const { host, href, pathname, search, hash } = new URL(url);
    return pathname === "/" && !search && !hash ? host : href;
  } catch {
    return url;
  }
}

const SearchBar = () => {
  const { activeTab, navigate, reload } = useBrowser();
  const inputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUrl = getDisplayValue(activeTab?.url ?? "");
  const value = isFocused ? draft : currentUrl;

  const handleFocus = () => {
    setDraft(currentUrl);
    setIsFocused(true);
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const query = draft.trim();
    if (!query || isSubmitting) return;

    setIsSubmitting(true);
    const succeeded = await navigate(query);
    setIsSubmitting(false);

    if (succeeded) inputRef.current?.blur();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") inputRef.current?.blur();
  };

  const className = [
    "search-bar",
    isFocused && "search-bar--focused",
    isSubmitting && "search-bar--submitting",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <form className="search-bar__form" onSubmit={handleSubmit}>
        <div className="search-bar__main">
          <div className="search-bar__input-container">
            <SearchIcon className="search-bar__search-icon" size={17} />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(event) => setDraft(event.target.value)}
              onFocus={handleFocus}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Search or enter website name"
              className="search-bar__input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Search or enter website name"
            />
          </div>

          <div className="search-bar__actions">
            <IconButton
              ariaLabel="Reload"
              className="tab-action-button tab-action-button--reload"
              onClick={() => void reload()}
            >
              <ReloadIcon size={17} />
            </IconButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
