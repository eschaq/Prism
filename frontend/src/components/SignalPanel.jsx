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
      const res = await fetch(`${apiBase}/api/signals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      onSignals(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const hasFeeds = checkedFeeds.length > 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-100">Signal Collection</h2>
        <p className="text-sm text-gray-400 mt-1">
          Scrape Reddit{hasFeeds ? " and RSS feeds" : ""} and extract structured business themes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Subreddits section */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            Subreddits ({checkedSubreddits.length} selected)
          </label>
          <div className="flex flex-wrap gap-2">
            {subreddits.map((s) => (
              <span
                key={s.name}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  s.checked
                    ? "border-indigo-500 bg-indigo-950 text-indigo-300"
                    : "border-gray-700 bg-gray-900 text-gray-500"
                }`}
              >
                <input
                  type="checkbox"
                  checked={s.checked}
                  onChange={() => toggleSubreddit(s.name)}
                  className="h-3 w-3 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
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
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          {loadingSuggestions && (
            <p className="text-xs text-gray-500 mt-2">Loading subreddit suggestions...</p>
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
              className="flex-1 rounded-md bg-gray-800 border border-gray-700 px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Add subreddit..."
            />
            <button
              type="button"
              onClick={addCustom}
              className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-2.5 py-1.5 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
            >
              <Plus size={12} />
              Add
            </button>
          </div>

          <button
            type="button"
            onClick={saveSubreddits}
            className="mt-2 rounded-md border border-gray-700 px-3 py-1 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
          >
            Save subreddits
          </button>
        </div>

        {/* RSS Feeds section */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            RSS Feeds ({checkedFeeds.length} selected)
          </label>
          <div className="flex flex-wrap gap-2">
            {feeds.map((f) => (
              <span
                key={f.url}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  f.checked
                    ? "border-indigo-500 bg-indigo-950 text-indigo-300"
                    : "border-gray-700 bg-gray-900 text-gray-500"
                }`}
              >
                <input
                  type="checkbox"
                  checked={f.checked}
                  onChange={() => toggleFeed(f.url)}
                  className="h-3 w-3 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
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
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          {loadingFeeds && (
            <p className="text-xs text-gray-500 mt-2">Loading RSS feed suggestions...</p>
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
              className="flex-1 rounded-md bg-gray-800 border border-gray-700 px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Add feed URL..."
            />
            <button
              type="button"
              onClick={addCustomFeed}
              className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-2.5 py-1.5 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
            >
              <Plus size={12} />
              Add
            </button>
          </div>

          <button
            type="button"
            onClick={saveFeeds}
            className="mt-2 rounded-md border border-gray-700 px-3 py-1 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
          >
            Save feeds
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Search Query
          </label>
          <input
            value={query}
            onChange={(e) => { queryManuallyEdited.current = true; setQuery(e.target.value); }}
            className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. enterprise AI tools"
          />
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Post Limit (per source)
            </label>
            <input
              type="number"
              min={5}
              max={100}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-24 rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || totalSources === 0}
            className="mt-5 rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Scraping..." : `Scan ${totalSources} source${totalSources !== 1 ? "s" : ""}`}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-md bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
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
        const rssCount = (result.rss_feeds || []).length;
        const subLabels = (result.subreddits || []).map((s) => `r/${s}`).join(" + ");
        const sourceLabel = rssCount > 0
          ? `${subLabels}${subLabels ? " + " : ""}${rssCount} RSS feed${rssCount !== 1 ? "s" : ""}`
          : subLabels;

        return (
        <div className="space-y-4">
          <div className="text-xs text-gray-500">
            {sourceLabel} · "{result.query}" · {posts.length} posts
          </div>

          {posts.length > 0 && (
            <div className="flex items-center gap-4 text-xs">
              <span className="text-green-400 font-medium">
                {wtpPercent}% WTP
                <span className="text-gray-500 font-normal ml-1">
                  ({wtpCount} of {posts.length} posts)
                </span>
              </span>
              <span className="text-gray-700">|</span>
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
                  <span className="text-gray-700">|</span>
                  <span className="text-gray-400">
                    Most recent: {recency}
                  </span>
                </>
              )}
            </div>
          )}

          <div className="space-y-3">
            {Array.isArray(result.themes) ? (
              result.themes.map((theme, i) => (
                <ThemeCard key={i} theme={theme} />
              ))
            ) : (
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap">{result.themes}</pre>
              </div>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
}

const PPS_COLORS = {
  PRODUCT: "text-purple-400 bg-purple-950 border-purple-800",
  SERIES: "text-blue-400 bg-blue-950 border-blue-800",
  POST: "text-gray-400 bg-gray-800 border-gray-700",
  AWARENESS: "text-gray-500 bg-gray-900 border-gray-800",
};

function ThemeCard({ theme }) {
  const sentimentColors = {
    positive: "text-green-400 bg-green-950 border-green-800",
    negative: "text-red-400 bg-red-950 border-red-800",
    neutral: "text-gray-400 bg-gray-800 border-gray-700",
    mixed: "text-yellow-400 bg-yellow-950 border-yellow-800",
  };
  const color = sentimentColors[theme.sentiment] || sentimentColors.neutral;
  const ppsColor = PPS_COLORS[theme.pps_tier] || PPS_COLORS.AWARENESS;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-100">{theme.theme}</span>
        <div className="flex gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${color}`}>
            {theme.sentiment}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full border border-gray-700 text-gray-400">
            {theme.frequency}
          </span>
          {theme.pps_tier && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${ppsColor}`}>
              {theme.pps_tier}
            </span>
          )}
          {theme.wtp_signal && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-green-800 bg-green-950 text-green-400 font-bold">
              $
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-300">{theme.description}</p>
      {theme.business_relevance && (
        <p className="text-xs text-gray-500">{theme.business_relevance}</p>
      )}
    </div>
  );
}
