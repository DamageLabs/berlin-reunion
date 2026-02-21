"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  location: string | null;
  platoon: string | null;
}

interface EventResult {
  id: string;
  title: string;
  startAt: string;
  location: string | null;
  visibility: string;
}

interface SearchResults {
  members: Member[];
  events: EventResult[];
}

export default function SearchCommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Flatten results into a single list for keyboard navigation
  const flatItems: { type: "member" | "event"; item: Member | EventResult }[] =
    [];
  if (results) {
    for (const m of results.members) flatItems.push({ type: "member", item: m });
    for (const e of results.events) flatItems.push({ type: "event", item: e });
  }

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(null);
      setActiveIndex(0);
      // Focus input after render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounced fetch
  const fetchResults = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&limit=5`,
        );
        if (res.ok) {
          const data: SearchResults = await res.json();
          setResults(data);
          setActiveIndex(0);
        }
      } catch {
        // Silently ignore network errors
      } finally {
        setLoading(false);
      }
    }, 250);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    fetchResults(value);
  }

  function navigateTo(path: string) {
    onClose();
    router.push(path);
  }

  function handleSelect(index: number) {
    const entry = flatItems[index];
    if (!entry) return;
    if (entry.type === "member") {
      navigateTo(`/users/${(entry.item as Member).id}`);
    } else {
      navigateTo("/calendar");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(activeIndex);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;

  const hasResults = results && (results.members.length > 0 || results.events.length > 0);
  const hasQuery = query.length >= 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[15vh]"
      style={{ animation: "fade-in 150ms ease-out" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-gold-dark/30 bg-charcoal shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center border-b border-gold-dark/20 px-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5 shrink-0 text-cream/30"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search members and events..."
            className="w-full bg-charcoal px-3 py-3 text-sm text-cream placeholder:text-cream/30 focus:outline-none"
          />
          {loading && (
            <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gold-dark/30 border-t-gold/60" />
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {!hasQuery && (
            <div className="px-4 py-8 text-center text-sm text-cream/30">
              Type to search members and events...
            </div>
          )}

          {hasQuery && !loading && !hasResults && (
            <div className="px-4 py-8 text-center text-sm text-cream/30">
              No results found
            </div>
          )}

          {results && results.members.length > 0 && (
            <div className="px-2 py-2">
              <div className="px-2 py-1.5 font-[family-name:var(--font-oswald)] text-xs uppercase tracking-wider text-gold/60">
                Members
              </div>
              {results.members.map((member, i) => {
                const idx = i;
                return (
                  <button
                    key={member.id}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${
                      activeIndex === idx
                        ? "bg-gold-dark/15"
                        : "hover:bg-gold-dark/10"
                    }`}
                    onClick={() => handleSelect(idx)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    {member.image ? (
                      <img
                        src={member.image}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-dark/20 font-[family-name:var(--font-oswald)] text-xs text-gold/60">
                        {member.name?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gold">
                        {member.name}
                      </div>
                      <div className="flex items-center gap-2 truncate text-xs">
                        {member.username && (
                          <span className="text-cream/50">
                            @{member.username}
                          </span>
                        )}
                        {member.location && (
                          <span className="text-cream/40">
                            {member.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {results && results.events.length > 0 && (
            <div className="px-2 py-2">
              <div className="px-2 py-1.5 font-[family-name:var(--font-oswald)] text-xs uppercase tracking-wider text-gold/60">
                Events
              </div>
              {results.events.map((evt, i) => {
                const idx = (results.members?.length ?? 0) + i;
                const date = new Date(evt.startAt);
                const month = date.toLocaleString("en-US", { month: "short" });
                const day = date.getDate();
                return (
                  <button
                    key={evt.id}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${
                      activeIndex === idx
                        ? "bg-gold-dark/15"
                        : "hover:bg-gold-dark/10"
                    }`}
                    onClick={() => handleSelect(idx)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <div className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded bg-gold-dark/20 font-[family-name:var(--font-oswald)] leading-none">
                      <span className="text-[10px] uppercase text-gold/60">
                        {month}
                      </span>
                      <span className="text-sm font-semibold text-gold">
                        {day}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate text-sm text-cream/80">
                        {evt.title}
                        {evt.visibility === "private" && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-3 w-3 shrink-0 text-red-400/70"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      {evt.location && (
                        <div className="truncate text-xs text-cream/40">
                          {evt.location}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 border-t border-gold-dark/20 px-4 py-2 text-xs text-cream/25">
          <span>
            <kbd className="rounded border border-gold-dark/20 px-1.5 py-0.5 font-mono text-[10px]">
              ↑↓
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="rounded border border-gold-dark/20 px-1.5 py-0.5 font-mono text-[10px]">
              ↵
            </kbd>{" "}
            select
          </span>
          <span>
            <kbd className="rounded border border-gold-dark/20 px-1.5 py-0.5 font-mono text-[10px]">
              esc
            </kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  );
}
