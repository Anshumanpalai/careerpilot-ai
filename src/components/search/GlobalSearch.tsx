import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { searchService, SearchResultItem } from "@/services/search.service";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  X,
  Briefcase,
  FileText,
  Loader2,
  ChevronRight,
} from "lucide-react";

interface GlobalSearchProps {
  className?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ className = "" }) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    applications: SearchResultItem[];
    resumes: SearchResultItem[];
    totalCount: number;
  }>({
    applications: [],
    resumes: [],
    totalCount: 0,
  });
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flatten items for keyboard navigation index calculation
  const allItems: SearchResultItem[] = [
    ...results.applications,
    ...results.resumes,
  ];

  // Perform debounced search with abort controller & request sequence counter
  const performSearch = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!trimmed) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setResults({ applications: [], resumes: [], totalCount: 0 });
      setIsLoading(false);
      setError(null);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    setError(null);

    debounceTimerRef.current = setTimeout(async () => {
      // Abort any prior in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentSeq = ++requestSeqRef.current;

      try {
        const data = await searchService.search(trimmed, { signal: controller.signal });
        // Only update if this is still the newest request
        if (currentSeq === requestSeqRef.current) {
          setResults(data);
          setSelectedIndex(-1);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Ignore aborted requests
        }
        if (currentSeq === requestSeqRef.current) {
          setError(err instanceof Error ? err.message : "Failed to load search results");
          setIsLoading(false);
        }
      }
    }, 220);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
    performSearch(value);
  };

  const handleClear = () => {
    setQuery("");
    setResults({ applications: [], resumes: [], totalCount: 0 });
    setError(null);
    setSelectedIndex(-1);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    inputRef.current?.focus();
    mobileInputRef.current?.focus();
  };

  const handleSelectItem = (item: SearchResultItem) => {
    setIsOpen(false);
    setIsMobileModalOpen(false);
    navigate(item.url);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (allItems.length > 0 ? (prev + 1) % allItems.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        allItems.length > 0 ? (prev <= 0 ? allItems.length - 1 : prev - 1) : -1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < allItems.length) {
        handleSelectItem(allItems[selectedIndex]);
      } else if (allItems.length > 0) {
        handleSelectItem(allItems[0]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setIsMobileModalOpen(false);
    }
  };

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Global hotkey Ctrl+K or / to focus search
  useEffect(() => {
    const handleGlobalHotkey = (e: KeyboardEvent) => {
      if (
        (e.key === "k" && (e.ctrlKey || e.metaKey)) ||
        (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement))
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalHotkey);
    return () => window.removeEventListener("keydown", handleGlobalHotkey);
  }, []);

  const renderDropdownContent = () => {
    if (isLoading) {
      return (
        <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Searching applications & resume documents...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 text-center text-xs text-destructive">
          <p className="font-semibold">Search unavailable</p>
          <p className="text-muted-foreground mt-0.5">{error}</p>
        </div>
      );
    }

    if (query.trim() && allItems.length === 0) {
      return (
        <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">No matches found for "{query.trim()}"</p>
          <p>Try searching for a company name, job title, location, or resume filename.</p>
        </div>
      );
    }

    if (!query.trim()) {
      return (
        <div className="p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
            Quick Suggestions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["Google", "Stripe", "Remote", "Software Engineer", "resume.pdf"].map((keyword) => (
              <button
                key={keyword}
                type="button"
                onClick={() => {
                  setQuery(keyword);
                  performSearch(keyword);
                  inputRef.current?.focus();
                }}
                className="px-2.5 py-1 rounded-md bg-muted/70 hover:bg-muted text-foreground text-xs transition-colors"
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      );
    }

    let runningIndex = 0;

    return (
      <div className="max-h-80 overflow-y-auto divide-y divide-border/60 py-1" role="listbox">
        {/* Applications Group */}
        {results.applications.length > 0 && (
          <div className="p-2 space-y-1">
            <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                Job Applications
              </span>
              <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded font-semibold">
                {results.applications.length}
              </span>
            </div>
            {results.applications.map((app) => {
              const itemIndex = runningIndex++;
              const isSelected = itemIndex === selectedIndex;
              return (
                <div
                  key={app.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectItem(app)}
                  onMouseEnter={() => setSelectedIndex(itemIndex)}
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                    isSelected ? "bg-accent text-accent-foreground font-medium" : "hover:bg-muted/60"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">{app.title}</span>
                      {app.statusBadge && (
                        <Badge variant={app.statusBadge.variant} className="text-[10px] py-0 px-1.5">
                          {app.statusBadge.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{app.subtitle}</p>
                    {app.details && (
                      <p className="text-[10px] text-muted-foreground/80 italic truncate">{app.details}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              );
            })}
          </div>
        )}

        {/* Resumes Group */}
        {results.resumes.length > 0 && (
          <div className="p-2 space-y-1">
            <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Resume Documents
              </span>
              <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded font-semibold">
                {results.resumes.length}
              </span>
            </div>
            {results.resumes.map((resume) => {
              const itemIndex = runningIndex++;
              const isSelected = itemIndex === selectedIndex;
              return (
                <div
                  key={resume.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectItem(resume)}
                  onMouseEnter={() => setSelectedIndex(itemIndex)}
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                    isSelected ? "bg-accent text-accent-foreground font-medium" : "hover:bg-muted/60"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">{resume.title}</span>
                      {resume.statusBadge && (
                        <Badge variant={resume.statusBadge.variant} className="text-[10px] py-0 px-1.5">
                          {resume.statusBadge.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{resume.subtitle}</p>
                    {resume.details && (
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 truncate">{resume.details}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              );
            })}
          </div>
        )}

        {/* Keyboard instructions footer */}
        <div className="px-3 py-2 bg-muted/40 text-[10px] text-muted-foreground flex items-center justify-between border-t border-border/50">
          <span>Navigate with ↑ ↓ • Press Enter to view</span>
          <span>Esc to close</span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Search Button (Visible on screens < md) */}
      <button
        type="button"
        onClick={() => {
          setIsMobileModalOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 50);
        }}
        className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg"
        aria-label="Open global search"
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Desktop Search Input with Popover (Visible on md and up) */}
      <div ref={containerRef} className={`relative hidden md:block ${className}`}>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-label="Search applications, resumes, and notes"
            placeholder="Search applications, resumes, notes..."
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="h-9 w-64 lg:w-80 rounded-lg border border-input bg-card pl-9 pr-14 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm transition-all"
          />

          <div className="absolute right-2.5 top-2 flex items-center gap-1">
            {query ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                aria-label="Clear search query"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground select-none pointer-events-none">
                Ctrl K
              </kbd>
            )}
          </div>
        </div>

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute left-0 top-full mt-2 w-80 lg:w-96 rounded-xl border border-border bg-card shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
            {renderDropdownContent()}
          </div>
        )}
      </div>

      {/* Mobile Fullscreen / Overlay Modal */}
      {isMobileModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col p-4 animate-in fade-in-50 duration-150 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Search opportunities and documents"
        >
          <div className="w-full max-w-lg mx-auto bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Search Header */}
            <div className="p-3 border-b border-border flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
              <input
                ref={mobileInputRef}
                type="text"
                placeholder="Search applications, resumes, notes..."
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMobileModalOpen(false)}
                className="p-1 rounded-md text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground ml-1 px-2 py-1"
              >
                Cancel
              </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {renderDropdownContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
