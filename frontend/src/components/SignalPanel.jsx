import React, { useState } from "react";
import { LoadingOverlay, CardSkeleton } from "./LoadingStates";

export default function SignalPanel({ apiBase, profile, onSignals }) {
  const [subreddit, setSubreddit] = useState("MachineLearning");
  const [query, setQuery] = useState("enterprise AI tools");
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/signals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subreddit, query, limit, profile }),
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-100">Signal Collection</h2>
        <p className="text-sm text-gray-400 mt-1">
          Scrape Reddit and extract structured business themes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Subreddit
            </label>
            <input
              value={subreddit}
              onChange={(e) => setSubreddit(e.target.value)}
              className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. MachineLearning"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Search Query
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. enterprise AI tools"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Post Limit
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
            disabled={loading}
            className="mt-5 rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Scraping..." : "Run Signal Collection"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-md bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && <LoadingOverlay message="Scraping Reddit and extracting signals..." />}

      {result && !loading && (
        <div className="space-y-4">
          <div className="text-xs text-gray-500">
            r/{result.subreddit} · "{result.query}" · {result.raw_posts?.length ?? 0} posts
          </div>
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
      )}
    </div>
  );
}

function ThemeCard({ theme }) {
  const sentimentColors = {
    positive: "text-green-400 bg-green-950 border-green-800",
    negative: "text-red-400 bg-red-950 border-red-800",
    neutral: "text-gray-400 bg-gray-800 border-gray-700",
    mixed: "text-yellow-400 bg-yellow-950 border-yellow-800",
  };
  const color = sentimentColors[theme.sentiment] || sentimentColors.neutral;

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
        </div>
      </div>
      <p className="text-sm text-gray-300">{theme.description}</p>
      {theme.business_relevance && (
        <p className="text-xs text-gray-500">{theme.business_relevance}</p>
      )}
    </div>
  );
}
