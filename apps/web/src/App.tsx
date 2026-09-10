import { useEffect, useState } from "react";
import {
  RotateCw,
  ArrowRight,
  X,
  Info,
  LockKeyhole,
  Menu,
} from "lucide-react";
import { useUnclosed } from "./hooks/useUnclosed";
import { WorkCard } from "./components/WorkCard";
import { WorkList } from "./components/WorkList";
import { Detail } from "./pages/Detail";
import { Settings } from "./pages/Settings";
import type { WorkItem } from "../../../shared/types";
import type { Page } from "./types";
import { Sidebar } from "./components/Sidebar";
import { DashboardHeading } from "./components/DashboardHeading";
import { ScanStatus } from "./components/ScanStatus";
import { WorkFilters } from "./components/WorkFilters";

const onRadar = (item: WorkItem) =>
  item.status === "OPEN" && item.category !== "Quiet" && item.available;

export default function App() {
  const { items, roots, scan, loading, error, setError, busy, mutate } =
    useUnclosed();
  const [page, setPage] = useState<Page>("radar");
  const [detail, setDetail] = useState<string | null>(
    window.location.pathname.match(/^\/work-item\/([a-f0-9]+)$/)?.[1] ?? null,
  );
  const [filter, setFilter] = useState("All loose ends");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("all");
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState("relevance");
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const listener = () =>
      setDetail(
        window.location.pathname.match(/^\/work-item\/([a-f0-9]+)$/)?.[1] ??
          null,
      );
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);

  const open = (id: string | null) => {
    setDetail(id);
    window.history.pushState({}, "", id ? `/work-item/${id}` : "/");
    window.scrollTo(0, 0);
  };

  const navigate = (next: Page) => {
    setPage(next);
    open(null);
    setQuery("");
    setFilter("All loose ends");
    setMobileNav(false);
  };

  const radar = items.filter(onRadar);
  const closed = items.filter((item) => item.status === "CLOSED");
  const fading = radar.filter((item) => item.category === "Fading");
  const active = radar.filter((item) => item.category === "Still Active");
  const running = scan?.status === "running";

  const filtered = items
    .filter((item) => {
      if (page === "closed" && item.status !== "CLOSED") return false;
      if (page === "ignored" && item.status !== "IGNORED") return false;
      if (page === "radar") {
        if (filter === "Snoozed" && item.status !== "SNOOZED") return false;
        if (filter !== "Snoozed" && filter !== "All scanned" && !onRadar(item))
          return false;
        if (
          !["All loose ends", "All scanned", "Snoozed"].includes(filter) &&
          item.category !== filter
        )
          return false;
      }
      return (
        (location === "all" || item.scanRoot === location) &&
        (kind === "all" || item.kind === kind) &&
        `${item.displayName} ${item.relativePath} ${item.signals.map((s) => s.title).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase())
      );
    })
    .sort((a, b) =>
      sort === "name"
        ? a.displayName.localeCompare(b.displayName)
        : sort === "modified"
          ? (Date.parse(b.latestModifiedAt ?? "") || 0) -
            (Date.parse(a.latestModifiedAt ?? "") || 0)
          : b.score - a.score,
    );

  const section = (
    title: string,
    description: string,
    list: WorkItem[],
    dot: string,
  ) =>
    list.length > 0 && (
      <section className="work-section" key={title}>
        <div className="section-heading">
          <h2>
            <i className={`section-dot ${dot}`} />
            {title}
            <span className="count-pill">{list.length}</span>
          </h2>
          {description && <span>{description}</span>}
        </div>
        <div className="card-grid">
          {list.map((item) => (
            <WorkCard
              key={item.id}
              item={item}
              location={
                roots.find((root) => root.id === item.scanRoot)?.label ??
                "Local folder"
              }
              onOpen={open}
            />
          ))}
        </div>
      </section>
    );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Sidebar
        mobileNav={mobileNav}
        page={page}
        radarCount={radar.length}
        closedCount={closed.length}
        roots={roots}
        navigate={navigate}
        onLocation={(id) => {
          navigate("radar");
          setLocation(id);
        }}
      />
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Toggle navigation"
            onClick={() => setMobileNav(!mobileNav)}
          >
            <Menu size={18} />
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="sep">/</span>
            <strong>
              {detail
                ? "Work item"
                : page === "radar"
                  ? "Radar"
                  : page === "closed"
                    ? "Closed"
                    : page === "ignored"
                      ? "Off the Radar"
                      : "Settings"}
            </strong>
          </div>
          <div className="topbar-status">
            <LockKeyhole size={13} />
            <span>Local workspace</span>
          </div>
        </header>

        <main id="main">
          {error && (
            <div className="error-banner" role="alert">
              <Info size={16} />
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={15} />
              </button>
            </div>
          )}

          {detail ? (
            <Detail
              id={detail}
              version={`${scan?.completedAt}-${items.find((i) => i.id === detail)?.status}`}
              onBack={() => open(null)}
              mutate={mutate}
              busy={busy || !!running}
            />
          ) : page === "settings" ? (
            <Settings roots={roots} openIgnored={() => navigate("ignored")} />
          ) : (
            <>
              <DashboardHeading
                page={page}
                radar={radar}
                fading={fading}
                active={active}
                closed={closed}
                roots={roots}
                running={!!running}
                busy={busy}
                mutate={mutate}
                setFilter={setFilter}
                navigate={navigate}
              />

              <ScanStatus scan={scan} roots={roots} mutate={mutate} />

              <WorkFilters
                page={page}
                filter={filter}
                setFilter={setFilter}
                query={query}
                setQuery={setQuery}
                location={location}
                setLocation={setLocation}
                kind={kind}
                setKind={setKind}
                sort={sort}
                setSort={setSort}
                roots={roots}
                radarCount={radar.length}
                resultCount={filtered.length}
                viewMode={viewMode}
                setViewMode={setViewMode}
              />

              {loading ? (
                <div className="empty-state">
                  <RotateCw size={24} className="spinning" />
                  <h2>Loading workspace…</h2>
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <h2>
                    {!roots.length
                      ? "No watched folders mounted."
                      : query || location !== "all" || kind !== "all"
                        ? "No matching items found."
                        : page === "ignored"
                          ? "No items are off the radar."
                          : page === "closed"
                            ? "No closed items."
                            : filter === "Fading"
                              ? "No fading items."
                              : filter === "Snoozed"
                                ? "No snoozed items."
                                : !scan?.completedAt
                                  ? "Ready to run your first scan."
                                  : "Radar is clear."}
                  </h2>
                  <p>
                    {!roots.length
                      ? "Start Unclosed with one or more folders to track loose ends."
                      : query
                        ? "Try clearing your search query or reset your filters."
                        : !scan?.completedAt
                          ? "Scan your mounted folders to discover unfinished work."
                          : "No loose ends found matching the current filter."}
                  </p>
                  {!roots.length && <code>./unclosed start ~/Documents</code>}
                  {roots.length > 0 && !scan?.completedAt && (
                    <button
                      className="primary scan-cta"
                      disabled={busy || !!running}
                      onClick={() => void mutate("/scans")}
                    >
                      Run scan <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              ) : viewMode === "list" ? (
                <WorkList items={filtered} roots={roots} onOpen={open} />
              ) : page === "radar" && filter === "All loose ends" ? (
                <>
                  {section(
                    "Needs Attention",
                    "Clues requiring follow-up",
                    filtered.filter((i) => i.category === "Needs Attention"),
                    "coral",
                  )}
                  {section(
                    "Fading",
                    "Quiet threads with unfinished tasks",
                    filtered.filter((i) => i.category === "Fading"),
                    "amber",
                  )}
                  {section(
                    "Still Active",
                    "Recent changes with open items",
                    filtered.filter((i) => i.category === "Still Active"),
                    "cyan",
                  )}
                </>
              ) : (
                section(
                  page === "radar"
                    ? filter
                    : page === "closed"
                      ? "Recently Closed"
                      : "Off the Radar",
                  "",
                  filtered,
                  page === "closed" ? "slate" : "cyan",
                )
              )}

              {page === "radar" &&
                filter === "All loose ends" &&
                closed.length > 0 &&
                viewMode === "cards" &&
                section(
                  "Recently Closed",
                  "Preserved history",
                  closed.slice(0, 3),
                  "slate",
                )}
            </>
          )}

          <footer className="main-footer">
            <span>
              <LockKeyhole size={13} /> Local-only analysis. Files mounted read-only.
            </span>
            <span>Unclosed v1.0</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
