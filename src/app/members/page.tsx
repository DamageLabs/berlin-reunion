"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import Skeleton from "@/components/Skeleton";

interface Member {
  id: string;
  name: string;
  username?: string;
  image?: string;
  location?: string;
  platoon?: string;
  yearsServed?: string;
}

const PAGE_SIZE = 20;

export default function MembersPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [platoonFilter, setPlatoonFilter] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const loadMembers = useCallback(
    async (p: number, search: string, platoon: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: String(PAGE_SIZE),
        });
        if (search) params.set("search", search);
        if (platoon) params.set("platoon", platoon);

        const res = await fetch(`/api/members?${params}`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members);
          setTotal(data.total);
        }
      } catch {
        // silently fail
      }
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    if (session) {
      loadMembers(page, debouncedSearch, platoonFilter);
    }
  }, [session, page, debouncedSearch, platoonFilter, loadMembers]);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 300);
  }

  function clearSearch() {
    setSearchQuery("");
    setDebouncedSearch("");
    clearTimeout(searchTimerRef.current);
    setPage(0);
  }

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
        <div className="mb-6 flex flex-wrap gap-3">
          <Skeleton className="h-10 flex-1 min-w-[200px] rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-gold-dark/20 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="mt-1 h-3 w-20" />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Auth guard ───────────────────────────────────────────────────────────

  if (!session) {
    router.push("/login");
    return null;
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
          Member Directory
        </h1>
        <p className="mt-1 text-sm text-cream/50">
          {total} {total === 1 ? "member" : "members"} with public profiles
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by name, username, or location..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 pr-8 text-sm text-cream placeholder:text-cream/30 focus:border-gold focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-cream/40 hover:text-cream/70"
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
        <select
          value={platoonFilter}
          onChange={(e) => {
            setPlatoonFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All Platoons</option>
          <option value="Scouts">Scouts</option>
          <option value="Snipers">Snipers</option>
          <option value="4.2">4.2</option>
          <option value="Tow">Tow</option>
          <option value="HQ">HQ</option>
        </select>
      </div>

      {/* Member Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-gold-dark/20 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="mt-1 h-3 w-20" />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-lg border border-gold-dark/20 p-8 text-center">
          <p className="text-sm text-cream/40">
            {debouncedSearch || platoonFilter
              ? "No members match your search."
              : "No public profiles yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/users/${member.id}`}
              className="rounded-lg border border-gold-dark/20 p-4 transition-colors hover:border-gold/40 hover:bg-gold-dark/5"
            >
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gold-dark/20">
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={`${member.name}'s photo`}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-lg text-gold-dark">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase tracking-wider text-gold truncate">
                    {member.name}
                  </p>
                  {member.username && (
                    <p className="text-xs text-cream/50 truncate">@{member.username}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 space-y-0.5 text-xs text-cream/50">
                {member.platoon && (
                  <p>{member.platoon}{member.yearsServed ? ` \u00B7 ${member.yearsServed}` : ""}</p>
                )}
                {member.location && <p>{member.location}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-md border border-gold-dark/40 px-3 py-1.5 text-sm text-cream/60 hover:border-gold/60 hover:text-cream disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-cream/50">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-md border border-gold-dark/40 px-3 py-1.5 text-sm text-cream/60 hover:border-gold/60 hover:text-cream disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Back link */}
      <div className="mt-8 text-center">
        <Link
          href="/home"
          className="text-sm font-medium text-gold-dark underline hover:text-gold"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
