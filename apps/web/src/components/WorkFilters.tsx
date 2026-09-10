import {
  Search,
  X,
  List,
  LayoutGrid,
  Filter,
} from "lucide-react";
import type { Root } from "../../../../shared/types";
import type { Page } from "../types";

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
  roots,
  radarCount,
  resultCount,
  viewMode,
  setViewMode,
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
  roots: Root[];
  radarCount: number;
  resultCount: number;
  viewMode: "list" | "cards";
  setViewMode: (mode: "list" | "cards") => void;
}) {
  return (
    <div className="toolbar-container">
      {/* Top Level: Segmented status pill bar */}
      <div className="status-segmented-bar" role="tablist" aria-label="Status filter">
        {(page === "radar"
          ? tabs
          : [page === "closed" ? "Recently Closed" : "Off the Radar"]
        ).map((tab) => {
          const isSelected = filter === tab || page !== "radar";
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isSelected}
              className={`status-tab ${isSelected ? "active" : ""}`}
              onClick={() => setFilter(tab)}
            >
              <span>{tab}</span>
              {tab === "All loose ends" && (
                <span className="tab-count">{radarCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Second Level: Search, Filters, Sort, View Toggle */}
      <div className="controls-row">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            aria-label="Search items"
            placeholder="Filter by name, path, or signal…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              aria-label="Clear search"
              className="clear-search-btn"
              onClick={() => setQuery("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="select-filters">
          <label className="filter-select-label" title="Filter by location">
            <span className="sr-only">Location</span>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              aria-label="Filter by location"
            >
              <option value="all">All locations</option>
              {roots.map((root) => (
                <option key={root.id} value={root.id}>
                  {root.label}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-select-label" title="Filter by type">
            <span className="sr-only">Work item type</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              aria-label="Filter by work item type"
            >
              <option value="all">Files & folders</option>
              <option value="file">Files only</option>
              <option value="folder">Folders only</option>
            </select>
          </label>

          <label className="filter-select-label" title="Sort items">
            <span className="sr-only">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort items"
            >
              <option value="relevance">Score (high to low)</option>
              <option value="modified">Last modified</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>

        <div className="toolbar-right">
          <span className="items-counter">
            {resultCount} {resultCount === 1 ? "item" : "items"}
          </span>

          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`toggle-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              title="Table / list view"
              aria-label="Table / list view"
              aria-pressed={viewMode === "list"}
            >
              <List size={16} />
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === "cards" ? "active" : ""}`}
              onClick={() => setViewMode("cards")}
              title="Card grid view"
              aria-label="Card grid view"
              aria-pressed={viewMode === "cards"}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
