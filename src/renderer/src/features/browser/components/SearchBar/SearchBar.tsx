import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { useBrowser } from '@/features/browser/state/BrowserContext';
import { NewTabIcon, SearchIcon } from '@/shared/icons';
import IconButton from '@/shared/components/IconButton';
import { MuteIcon, ReloadIcon } from '@/shared/icons';

import './SearchBar.css';

const NEW_TAB_PATH = '/start';

interface SearchSuggestion {
  id: string;
  title: string;
  subtitle?: string;
  url?: string;
}

const suggestions: SearchSuggestion[] = [
  {
    id: 'start-page',
    title: 'Start Page',
  },
];

function getDisplayValue(url: string): string {
  if (!url) {
    return '';
  }

  try {
    const parsed = new URL(url);

    // Don't expose our internal start-page URL.
    if (parsed.pathname === NEW_TAB_PATH) {
      return '';
    }

    // Remove trailing slash for cleaner browser-bar display.
    if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
      return parsed.host;
    }

    return parsed.href;
  } catch {
    return url;
  }
}

const SearchBar = () => {
  const { activeTab } = useBrowser();

  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  /*
   * Browser state → input state.
   *
   * Only synchronize when the user isn't editing.
   */
  useEffect(() => {
    if (!isFocused) {
      setValue(getDisplayValue(activeTab?.url ?? ''));
    }
  }, [activeTab?.url, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);

    /*
     * When the user focuses the omnibox, show the current
     * browser URL and select everything.
     */
    const currentValue = getDisplayValue(activeTab?.url ?? '');

    setValue(currentValue);
    setSelectedSuggestionIndex(-1);

    requestAnimationFrame(() => {
      inputRef.current?.select();
    });
  };

  const handleBlur = () => {
    /*
     * Don't immediately replace the value with activeTab.url here.
     * Navigation may still be in progress.
     *
     * The effect above will synchronize the value when browser
     * state changes.
     */
    setIsFocused(false);
    setSelectedSuggestionIndex(-1);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    setSelectedSuggestionIndex(-1);
  };

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const query = value.trim();

    if (!query || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await window.browser.navigate(query);

      if (!result.success) {
        console.error('SearchBar: navigation failed', result.error);
        return;
      }

      inputRef.current?.blur();
    } catch (error) {
      console.error('SearchBar: unexpected navigation error', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();

      inputRef.current?.blur();
      setValue(getDisplayValue(activeTab?.url ?? ''));
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      setSelectedSuggestionIndex((current) =>
        Math.min(current + 1, suggestions.length - 1)
      );

      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      setSelectedSuggestionIndex((current) => Math.max(current - 1, -1));

      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (selectedSuggestionIndex >= 0) {
        const suggestion = suggestions[selectedSuggestionIndex];

        if (suggestion.url) {
          setValue(suggestion.url);
        }
      }

      void handleSubmit();
    }
  };

  return (
    <div
      className={[
        'search-bar',
        isFocused && 'search-bar--focused',
        isSubmitting && 'search-bar--submitting',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <form className="search-bar__form" onSubmit={handleSubmit}>
        <div className="search-bar__main">
          <div className="search-bar__input-container">
            <SearchIcon className="search-bar__search-icon" size={17} />

            <input
              ref={inputRef}
              type="text"
              value={value}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Search or enter website name"
              className="search-bar__input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Search or enter website name"
              aria-autocomplete="list"
              // aria-expanded={showSuggestions}
              disabled={isSubmitting}
            />
          </div>

          <div className="search-bar__actions">
            <IconButton
              ariaLabel="Reload"
              className="tab-action-button tab-action-button--reload"
            >
              <ReloadIcon size={17} />
            </IconButton>

            <IconButton
              ariaLabel="Mute"
              className="tab-action-button tab-action-button--mute"
            >
              <MuteIcon size={17} />
            </IconButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
