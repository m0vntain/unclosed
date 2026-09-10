import { useEffect, useState } from "react";
import {
  Radar,
  RotateCw,
  ArrowRight,
  X,
  Info,
  LockKeyhole,
  Menu,
} from "lucide-react";
import { useUnclosed } from "./hooks/useUnclosed";
import { WorkCard } from "./components/WorkCard";

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
  const [showFilters, setShowFilters] = useState(false);
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
          <span>{description}</span>
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
          setShowFilters(true);
        }}
      />
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Toggle navigation"
            onClick={() => setMobileNav(!mobileNav)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
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
          <span className="local-tag">
            <span /> Running locally <LockKeyhole size={12} />
          </span>
        </header>
        <main id="main">
          {error && (
            <div className="error" role="alert">
              <Info size={18} />
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={17} />
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
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                roots={roots}
                radarCount={radar.length}
                resultCount={filtered.length}
              />
              {loading ? (
                <div className="empty">
                  <RotateCw size={28} className="spinning" />
                  <h2>Opening your workspace…</h2>
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty">
                  <span className="empty-symbol">
                    <Radar size={36} />
                  </span>
                  <h2>
                    {!roots.length
                      ? "Nothing to scan yet."
                      : query || location !== "all" || kind !== "all"
                        ? "No matches this time."
                        : page === "ignored"
                          ? "Nothing is off the radar."
                          : page === "closed"
                            ? "Room for a little closure."
                            : filter === "Fading"
                              ? "Nothing fading."
                              : filter === "Snoozed"
                                ? "Nothing snoozed."
                                : !scan?.completedAt
                                  ? "Your next step starts with a sweep."
                                  : items.length === 0
                                    ? "Nothing work-like was found in these folders."
                                    : "Radar clear."}
                  </h2>
                  <p>
                    {!roots.length
                      ? "Start Unclosed with one or more local folders."
                      : query
                        ? "Try another name or clear your filters."
                        : filter === "Fading"
                          ? "Fading appears after sustained observed activity goes quiet with loose ends remaining."
                          : page === "closed"
                            ? "Mark an item closed when you consider it finished."
                            : !scan?.completedAt
                              ? "We’ll look for concrete clues, and leave the decisions to you."
                              : "Nothing to show in this view right now."}
                  </p>
                  {!roots.length && <code>./unclosed start ~/Documents</code>}
                  {roots.length > 0 && !scan?.completedAt && (
                    <button
                      className="primary"
                      disabled={busy || !!running}
                      onClick={() => void mutate("/scans")}
                    >
                      Run your first sweep <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              ) : page === "radar" && filter === "All loose ends" ? (
                <>
                  {section(
                    "Needs Attention",
                    "A few concrete clues to follow up on",
                    filtered.filter((i) => i.category === "Needs Attention"),
                    "coral",
                  )}
                  {section(
                    "Fading",
                    "Activity slowed. A few loose ends remain.",
                    filtered.filter((i) => i.category === "Fading"),
                    "amber",
                  )}
                  {section(
                    "Still Active",
                    "Open threads with recent activity",
                    filtered.filter((i) => i.category === "Still Active"),
                    "sage",
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
                  page === "closed" ? "slate" : "sage",
                )
              )}
              {page === "radar" &&
                filter === "All loose ends" &&
                closed.length > 0 &&
                section(
                  "Recently Closed",
                  "A decision made. History preserved.",
                  closed.slice(0, 3),
                  "slate",
                )}
              {page === "radar" &&
                items.length > 0 &&
                items.every((i) => i.history.length <= 1) && (
                  <div className="first-scan-note">
                    <span>
                      <Info size={19} />
                    </span>
                    <div>
                      <strong>A first look, not the whole story.</strong>
                      <p>
                        This sweep gives you file evidence. Scan again over time
                        to see activity patterns and work that starts to fade.
                      </p>
                    </div>
                  </div>
                )}
            </>
          )}
          <footer className="main-footer">
            <span>
              <LockKeyhole size={13} /> Your files stay local and are mounted
              read-only. Unclosed cannot modify them.
            </span>
            <span>Evidence, not assumptions.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
