import { Search, X, SlidersHorizontal } from "lucide-react";
import type { Root, WorkItem, ScanProgress } from "../../../../shared/types";
import type { Page, Mutation } from "../types";
const tabs = [
  "All loose ends",
  "Needs Attention",
  "Fading",
  "Still Active",
  "Snoozed",
  "All scanned",
];

export function WorkFilters({
  page,
  filter,
  setFilter,
  query,
  setQuery,
  location,
  setLocation,
  kind,
  setKind,
  sort,
  setSort,
  showFilters,
  setShowFilters,
  roots,
  radarCount,
  resultCount,
}: {
  page: Page;
  filter: string;
  setFilter: (value: string) => void;
  query: string;
  setQuery: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  kind: string;
  setKind: (value: string) => void;
  sort: string;
  setSort: (value: string) => void;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  roots: Root[];
  radarCount: number;
  resultCount: number;
}) {
  return (
    <>
      <div className="radar-toolbar">
        <div className="tabs" aria-label="Filter work items">
          {(page === "radar"
            ? tabs
            : [page === "closed" ? "Recently Closed" : "Off the Radar"]
          ).map((tab) => (
            <button
              key={tab}
              className={filter === tab || page !== "radar" ? "current" : ""}
              aria-pressed={filter === tab || page !== "radar"}
              onClick={() => setFilter(tab)}
            >
              {tab}
              {tab === "All loose ends" && <span>{radarCount}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="search-row">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Search work items"
            placeholder="Find a file, folder, or loose end…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              aria-label="Clear search"
              className="icon-button"
              onClick={() => setQuery("")}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <span className="result-count">
          {resultCount} item{resultCount === 1 ? "" : "s"}
        </span>
        <button
          className={`filter-button ${showFilters ? "pressed" : ""}`}
          aria-expanded={showFilters}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal size={16} /> Filters
        </button>
        <label className="sort-label">
          Sort by{" "}
          <select
            aria-label="Sort items"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="relevance">Relevance</option>
            <option value="modified">Last modification</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
      {showFilters && (
        <div className="filter-panel">
          <label>
            Location
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="all">All watched locations</option>
              {roots.map((root) => (
                <option key={root.id} value={root.id}>
                  {root.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Work item
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">Files and folders</option>
              <option value="file">Files</option>
              <option value="folder">Folders</option>
            </select>
          </label>
          <button
            className="text-button"
            onClick={() => {
              setLocation("all");
              setKind("all");
              setQuery("");
            }}
          >
            Reset filters
          </button>
        </div>
      )}
    </>
  );
}
