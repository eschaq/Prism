import React, { useState, useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import { StepProgress, CardSkeleton } from "./LoadingStates";

const SUBREDDITS_KEY = "prism_subreddits";
const FEEDS_KEY = "prism_feeds";

function loadSavedSubreddits() {
  try {
    const stored = localStorage.getItem(SUBREDDITS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function loadSavedFeeds() {
  try {
    const stored = localStorage.getItem(FEEDS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function feedDisplayName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function SignalPanel({ apiBase, profile, initialConfig, onSignals }) {
  const [subreddits, setSubreddits] = useState(
    () => initialConfig?.subreddits || loadSavedSubreddits()
  );
  const [customInput, setCustomInput] = useState("");
  const [feeds, setFeeds] = useState(loadSavedFeeds);
  const [webSearch, setWebSearch] = useState(() => {
    try { return localStorage.getItem("prism_web_search") === "true"; } catch { return false; }
  });
  const [feedInput, setFeedInput] = useState("");
  const [query, setQuery] = useState(() => initialConfig?.query || "");
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const queryManuallyEdited = useRef(!!initialConfig?.query);

  // Fetch subreddit suggestions on industry change
  useEffect(() => {
    if (!profile?.industry) return;
    const suggestedQuery = profile.industry
      .toLowerCase()
      .replace(/&/g, "")
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim() + " tools";
    if (!queryManuallyEdited.current) {
      setQuery(suggestedQuery);
    }
    let cancelled = false;
    async function fetchSuggestions() {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(`${apiBase}/api/subreddits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ industry: profile.industry, query: suggestedQuery }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.suggested)) {
          setSubreddits(
            data.suggested.map((name) => ({ name, checked: true }))
          );
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    }
    fetchSuggestions();
    return () => { cancelled = true; };
  }, [profile?.industry, apiBase]);

  // Fetch RSS feed suggestions on industry change
  useEffect(() => {
    if (!profile?.industry) return;
    let cancelled = false;
    async function fetchFeeds() {
      setLoadingFeeds(true);
      try {
        const res = await fetch(`${apiBase}/api/feeds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ industry: profile.industry }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.suggested)) {
          setFeeds(
            data.suggested.map((url) => ({ url, checked: true }))
          );
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoadingFeeds(false);
      }
    }
    fetchFeeds();
    return () => { cancelled = true; };
  }, [profile?.industry, apiBase]);

  function toggleSubreddit(name) {
    setSubreddits((prev) =>
      prev.map((s) => (s.name === name ? { ...s, checked: !s.checked } : s))
    );
  }

  function removeSubreddit(name) {
    setSubreddits((prev) => prev.filter((s) => s.name !== name));
  }

  function addCustom() {
    const name = customInput.trim().replace(/^r\//, "");
    if (!name) return;
    const exists = subreddits.some((s) => s.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      setSubreddits((prev) => [...prev, { name, checked: true }]);
    }
    setCustomInput("");
  }

  function saveSubreddits() {
    localStorage.setItem(SUBREDDITS_KEY, JSON.stringify(subreddits));
  }

  function toggleFeed(url) {
    setFeeds((prev) =>
      prev.map((f) => (f.url === url ? { ...f, checked: !f.checked } : f))
    );
  }

  function removeFeed(url) {
    setFeeds((prev) => prev.filter((f) => f.url !== url));
  }

  function addCustomFeed() {
    const url = feedInput.trim();
    if (!url) return;
    const exists = feeds.some((f) => f.url.toLowerCase() === url.toLowerCase());
    if (!exists) {
      setFeeds((prev) => [...prev, { url, checked: true }]);
    }
    setFeedInput("");
  }

  function saveFeeds() {
    localStorage.setItem(FEEDS_KEY, JSON.stringify(feeds));
  }

  const checkedSubreddits = subreddits.filter((s) => s.checked).map((s) => s.name);
  const checkedFeeds = feeds.filter((f) => f.checked).map((f) => f.url);
  const totalSources = checkedSubreddits.length + checkedFeeds.length;

  async function handleSubmit(e) {
    e.preventDefault();
    if (totalSources === 0) {
      setError("Select at least one subreddit or RSS feed.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body = { subreddits: checkedSubreddits, query, limit, profile };
      if (checkedFeeds.length > 0) {
        body.rss_feeds = checkedFeeds;
      }
      if (webSearch) {
        body.web_search = true;
      }
      const res = await fetch(`${apiBase}/api/signals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      onSignals(data);
      // Save snapshot for delta comparison on next scan
      if (Array.isArray(data.themes)) {
        const snapshot = {};
        data.themes.forEach((t) => {
          if (t.theme) snapshot[t.theme.toLowerCase()] = t.pps_tier || "AWARENESS";
        });
        localStorage.setItem("prism_last_scan", JSON.stringify({ timestamp: Date.now(), themes: snapshot }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const hasFeeds = checkedFeeds.length > 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <p className="text-sm text-on-surface-variant/70 italic leading-relaxed">Tell Prism where to listen. Select your subreddits and feeds, confirm your search query, and hit Scan. The more sources you add, the richer the signal.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Subreddits section */}
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-2">
            Subreddits ({checkedSubreddits.length} selected)
          </label>
          <div className="flex flex-wrap gap-2">
            {subreddits.map((s) => (
              <span
                key={s.name}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  s.checked
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-outline-variant bg-surface-container-low text-on-surface-variant"
                }`}
              >
                <input
                  type="checkbox"
                  checked={s.checked}
                  onChange={() => toggleSubreddit(s.name)}
                  className="h-3 w-3 rounded border-outline-variant bg-surface-container-high text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                />
                <span
                  className="cursor-pointer"
                  onClick={() => toggleSubreddit(s.name)}
                >
                  r/{s.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeSubreddit(s.name)}
                  className="text-outline hover:text-on-surface-variant transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          {loadingSuggestions && (
            <p className="text-xs text-outline mt-2">Loading subreddit suggestions...</p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              className="flex-1 rounded-md bg-surface-container-lowest border border-outline-variant/20 px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body"
              placeholder="Add subreddit..."
            />
            <button
              type="button"
              onClick={addCustom}
              className="inline-flex items-center gap-1 rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface font-label text-xs transition-all px-2.5 py-1.5"
            >
              <Plus size={12} />
              Add
            </button>
          </div>

          <button
            type="button"
            onClick={saveSubreddits}
            className="mt-2 rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface font-label text-xs transition-all px-3 py-1"
          >
            Save subreddits
          </button>
        </div>

        {/* RSS Feeds section */}
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-2">
            RSS &amp; Podcast Feeds ({checkedFeeds.length} selected)
          </label>
          <p className="text-[10px] text-outline mb-2">News feeds, blog RSS, and podcast RSS are all supported.</p>
          <div className="flex flex-wrap gap-2">
            {feeds.map((f) => (
              <span
                key={f.url}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  f.checked
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-outline-variant bg-surface-container-low text-on-surface-variant"
                }`}
              >
                <input
                  type="checkbox"
                  checked={f.checked}
                  onChange={() => toggleFeed(f.url)}
                  className="h-3 w-3 rounded border-outline-variant bg-surface-container-high text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                />
                <span
                  className="cursor-pointer"
                  onClick={() => toggleFeed(f.url)}
                  title={f.url}
                >
                  {feedDisplayName(f.url)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFeed(f.url)}
                  className="text-outline hover:text-on-surface-variant transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          {loadingFeeds && (
            <p className="text-xs text-outline mt-2">Loading RSS feed suggestions...</p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <input
              value={feedInput}
              onChange={(e) => setFeedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomFeed();
                }
              }}
              className="flex-1 rounded-md bg-surface-container-lowest border border-outline-variant/20 px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body"
              placeholder="Add feed URL or podcast RSS..."
            />
            <button
              type="button"
              onClick={addCustomFeed}
              className="inline-flex items-center gap-1 rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface font-label text-xs transition-all px-2.5 py-1.5"
            >
              <Plus size={12} />
              Add
            </button>
          </div>

          <button
            type="button"
            onClick={saveFeeds}
            className="mt-2 rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface font-label text-xs transition-all px-3 py-1"
          >
            Save feeds
          </button>
        </div>

        {/* Web Search toggle */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={webSearch}
            onChange={(e) => {
              setWebSearch(e.target.checked);
              localStorage.setItem("prism_web_search", String(e.target.checked));
            }}
            className="mt-0.5 h-4 w-4 rounded border-outline-variant bg-surface-container-high text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
          />
          <div>
            <label className="text-xs font-medium text-on-surface cursor-pointer" onClick={() => {
              const next = !webSearch;
              setWebSearch(next);
              localStorage.setItem("prism_web_search", String(next));
            }}>
              Include web search
            </label>
            <p className="text-[10px] text-outline mt-0.5">Search recent industry news and discussions via AI-powered web search.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">
            Search Query
          </label>
          <input
            value={query}
            onChange={(e) => { queryManuallyEdited.current = true; setQuery(e.target.value); }}
            className="w-full rounded-md bg-surface-container-lowest border border-outline-variant/20 px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body"
            placeholder="e.g. enterprise AI tools"
          />
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">
              Post Limit (per source)
            </label>
            <input
              type="number"
              min={5}
              max={100}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-24 rounded-md bg-surface-container-lowest border border-outline-variant/20 px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body"
            />
          </div>
          <button
            type="submit"
            disabled={loading || totalSources === 0}
            className="mt-5 bg-[#5C6BC0] text-white px-6 py-2.5 rounded-xl font-label font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? "Scraping..." : `Scan ${totalSources} source${totalSources !== 1 ? "s" : ""}`}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-md bg-error-container/20 border border-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </div>
      )}

      {loading && (
        <StepProgress
          steps={[
            hasFeeds ? "Fetching posts from Reddit and RSS..." : "Fetching posts from Reddit...",
            "Scoring and filtering posts...",
            "Extracting themes with AI...",
          ]}
          active={loading}
        />
      )}

      {result && !loading && (() => {
        const posts = result.raw_posts || [];
        const wtpCount = posts.filter((p) => p.wtp_detected).length;
        const wtpPercent = posts.length ? Math.round((wtpCount / posts.length) * 100) : 0;
        const ppsDist = { PRODUCT: 0, SERIES: 0, POST: 0, AWARENESS: 0 };
        posts.forEach((p) => { if (ppsDist[p.pps_label] !== undefined) ppsDist[p.pps_label]++; });
        const newestTimestamp = Math.max(...posts.map((p) => p.created || 0));
        function formatRecency(ts) {
          if (!ts) return null;
          const seconds = Math.floor(Date.now() / 1000 - ts);
          if (seconds < 3600) return "minutes ago";
          const hours = Math.floor(seconds / 3600);
          if (hours < 24) return `${hours}h ago`;
          const days = Math.floor(hours / 24);
          if (days < 7) return `${days}d ago`;
          return `${Math.floor(days / 7)}w ago`;
        }
        const recency = formatRecency(newestTimestamp);
        const datedPosts = posts.filter((p) => p.created > 0);
        let urgency = null;
        let olderCount = 0;
        let recentCount = 0;
        if (datedPosts.length >= 4) {
          const oldest = Math.min(...datedPosts.map((p) => p.created));
          const newest = Math.max(...datedPosts.map((p) => p.created));
          const midpoint = (oldest + newest) / 2;
          olderCount = datedPosts.filter((p) => p.created < midpoint).length;
          recentCount = datedPosts.filter((p) => p.created >= midpoint).length;
          if (recentCount > olderCount * 1.3) urgency = "Accelerating";
          else if (recentCount < olderCount * 0.7) urgency = "Declining";
          else urgency = "Stable";
        }
        const rssCount = (result.rss_feeds || []).length;
        const subLabels = (result.subreddits || []).map((s) => `r/${s}`).join(" + ");
        const sourceLabel = rssCount > 0
          ? `${subLabels}${subLabels ? " + " : ""}${rssCount} RSS feed${rssCount !== 1 ? "s" : ""}`
          : subLabels;

        return (
        <div className="space-y-4">
          <div className="text-xs text-outline">
            {sourceLabel} · "{result.query}" · {posts.length} posts
          </div>

          {posts.length > 0 && (
            <div className="flex items-center gap-4 text-xs">
              <span className="text-secondary font-medium">
                {wtpPercent}% WTP
                <span className="text-outline font-normal ml-1">
                  ({wtpCount} of {posts.length} posts)
                </span>
              </span>
              <span className="text-outline-variant">|</span>
              <span className={`font-medium ${PPS_COLORS.PRODUCT.split(" ").find((c) => c.startsWith("text-"))}`}>
                {ppsDist.PRODUCT} PRODUCT
              </span>
              <span className={`font-medium ${PPS_COLORS.SERIES.split(" ").find((c) => c.startsWith("text-"))}`}>
                {ppsDist.SERIES} SERIES
              </span>
              <span className={`font-medium ${PPS_COLORS.POST.split(" ").find((c) => c.startsWith("text-"))}`}>
                {ppsDist.POST} POST
              </span>
              <span className={`font-medium ${PPS_COLORS.AWARENESS.split(" ").find((c) => c.startsWith("text-"))}`}>
                {ppsDist.AWARENESS} AWARENESS
              </span>
              {recency && (
                <>
                  <span className="text-outline-variant">|</span>
                  <span className="text-on-surface-variant">
                    Most recent: {recency}
                  </span>
                </>
              )}
              {urgency && (
                <>
                  <span className="text-outline-variant">|</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-end gap-px" style={{ width: 40, height: 10 }}>
                      <div
                        className="bg-outline rounded-sm"
                        style={{
                          width: `${(olderCount / (olderCount + recentCount)) * 100}%`,
                          height: "100%",
                        }}
                      />
                      <div
                        className={`rounded-sm ${
                          urgency === "Accelerating" ? "bg-error" : urgency === "Declining" ? "bg-primary-dim" : "bg-outline"
                        }`}
                        style={{
                          width: `${(recentCount / (olderCount + recentCount)) * 100}%`,
                          height: "100%",
                        }}
                      />
                    </div>
                    <span className={`font-medium ${
                      urgency === "Accelerating" ? "text-error" : urgency === "Declining" ? "text-primary-dim" : "text-on-surface-variant"
                    }`}>
                      {urgency === "Accelerating" ? "↑" : urgency === "Declining" ? "↓" : "→"} {urgency}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {Array.isArray(result.themes) ? (() => {
            const TIER_ORDER = { AWARENESS: 0, POST: 1, SERIES: 2, PRODUCT: 3 };
            const tiers = ["PRODUCT", "SERIES", "POST", "AWARENESS"];

            // Delta computation
            let prevScan = null;
            try {
              const stored = localStorage.getItem("prism_last_scan");
              if (stored) prevScan = JSON.parse(stored);
            } catch { /* ignore */ }

            const deltaMap = {};
            let newCount = 0;
            let risingCount = 0;
            let decliningCount = 0;
            let goneCount = 0;

            if (prevScan?.themes) {
              const prevThemes = prevScan.themes;
              result.themes.forEach((t) => {
                if (!t.theme) return;
                const key = t.theme.toLowerCase();
                const curTier = TIER_ORDER[t.pps_tier] ?? 0;
                if (key in prevThemes) {
                  const prevTier = TIER_ORDER[prevThemes[key]] ?? 0;
                  if (curTier > prevTier) { deltaMap[key] = "RISING"; risingCount++; }
                  else if (curTier < prevTier) { deltaMap[key] = "DECLINING"; decliningCount++; }
                  else { deltaMap[key] = "STABLE"; }
                } else {
                  deltaMap[key] = "NEW"; newCount++;
                }
              });
              // Count GONE themes
              const currentKeys = new Set(result.themes.filter((t) => t.theme).map((t) => t.theme.toLowerCase()));
              Object.keys(prevThemes).forEach((k) => {
                if (!currentKeys.has(k)) goneCount++;
              });
            }

            const hasDelta = prevScan?.themes && (newCount > 0 || risingCount > 0 || decliningCount > 0 || goneCount > 0);

            // Group themes
            const grouped = {};
            tiers.forEach((t) => { grouped[t] = []; });
            grouped["OTHER"] = [];
            result.themes.forEach((theme) => {
              const tier = tiers.includes(theme.pps_tier) ? theme.pps_tier : "OTHER";
              grouped[tier].push(theme);
            });

            return (
            <div className="space-y-6">
              {/* Delta summary */}
              {hasDelta && (
                <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm text-outline">compare_arrows</span>
                  <span>
                    {newCount > 0 && <span className="text-secondary font-medium">{newCount} new</span>}
                    {newCount > 0 && (risingCount > 0 || decliningCount > 0 || goneCount > 0) && ", "}
                    {risingCount > 0 && <span className="text-secondary font-medium">{risingCount} rising</span>}
                    {risingCount > 0 && (decliningCount > 0 || goneCount > 0) && ", "}
                    {decliningCount > 0 && <span className="text-error font-medium">{decliningCount} declining</span>}
                    {decliningCount > 0 && goneCount > 0 && ", "}
                    {goneCount > 0 && <span className="text-outline font-medium">{goneCount} gone</span>}
                    <span className="text-outline ml-1">since last scan</span>
                  </span>
                </div>
              )}

              {[...tiers, "OTHER"].map((tier) => {
                if (!grouped[tier].length) return null;
                const colorClass = (PPS_COLORS[tier] || PPS_COLORS.OTHER)
                  .split(" ").find((c) => c.startsWith("text-"));
                const bgClass = (PPS_COLORS[tier] || PPS_COLORS.OTHER)
                  .split(" ").find((c) => c.startsWith("bg-"));
                return (
                  <div key={tier} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${bgClass}`} />
                      <span className={`text-xs font-semibold ${colorClass}`}>
                        {tier} ({grouped[tier].length})
                      </span>
                      <div className="flex-1 h-px bg-outline-variant/10" />
                    </div>
                    {grouped[tier].map((theme, i) => (
                      <ThemeCard key={`${tier}-${i}`} theme={theme} delta={theme.theme ? deltaMap[theme.theme.toLowerCase()] : null} />
                    ))}
                  </div>
                );
              })}
            </div>
            );
          })() : (
            <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px]" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
              <pre className="text-xs text-on-surface-variant whitespace-pre-wrap">{result.themes}</pre>
            </div>
          )}
        </div>
        );
      })()}
    </div>
  );
}

const PPS_COLORS = {
  PRODUCT: "text-primary-container bg-primary-container/10 border-primary-container/20",
  SERIES: "text-primary-dim bg-primary-dim/10 border-primary-dim/20",
  POST: "text-on-surface-variant bg-surface-container-high border-outline-variant",
  AWARENESS: "text-outline bg-surface-container-low border-outline-variant/10",
  OTHER: "text-outline bg-surface-container-low border-outline-variant/10",
};

const DELTA_STYLES = {
  NEW: { label: "NEW", icon: "✦", className: "text-secondary border-secondary/20 bg-secondary/10" },
  RISING: { label: "↑ RISING", icon: null, className: "text-secondary border-secondary/20 bg-secondary/10" },
  STABLE: { label: "→", icon: null, className: "text-outline border-outline-variant bg-surface-container-high" },
  DECLINING: { label: "↓ DECLINING", icon: null, className: "text-error border-error-container bg-error-container/20" },
};

function ThemeCard({ theme, delta }) {
  const sentimentColors = {
    positive: "text-secondary bg-secondary/10 border-secondary/20",
    negative: "text-error bg-error-container/20 border-error-container",
    neutral: "text-on-surface-variant bg-surface-container-high border-outline-variant",
    mixed: "text-tertiary bg-tertiary/10 border-tertiary/20",
  };
  const color = sentimentColors[theme.sentiment] || sentimentColors.neutral;
  const ppsColor = PPS_COLORS[theme.pps_tier] || PPS_COLORS.AWARENESS;
  const deltaStyle = delta ? DELTA_STYLES[delta] : null;

  return (
    <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px] space-y-2" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
      <div className="flex items-center justify-between">
        <span className="font-medium text-on-surface">{theme.theme}</span>
        <div className="flex gap-2">
          {deltaStyle && delta !== "STABLE" && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${deltaStyle.className}`}>
              {deltaStyle.label}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full border ${color}`}>
            {theme.sentiment}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full border border-outline-variant text-on-surface-variant">
            {theme.frequency}
          </span>
          {theme.pps_tier && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${ppsColor}`}>
              {theme.pps_tier}
            </span>
          )}
          {theme.wtp_signal && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-secondary/20 bg-secondary/10 text-secondary font-bold">
              $
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-on-surface-variant">{theme.description}</p>
      {theme.business_relevance && (
        <p className="text-xs text-outline">{theme.business_relevance}</p>
      )}
    </div>
  );
}
