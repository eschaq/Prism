import React, { useState } from "react";
import { LoadingOverlay } from "./LoadingStates";
import AUDIENCES from "../audiences";

export default function NarrativePanel({ apiBase, audience, signals, analysis, gaps, onNarrative }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const canRun = signals && analysis;
  const audienceLabel = AUDIENCES.find((a) => a.id === audience)?.label ?? audience;

  async function handleGenerate() {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${apiBase}/api/narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience, signals, analysis, gaps }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      if (onNarrative) onNarrative(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-100">Narrative Engine</h2>
        <p className="text-sm text-gray-400 mt-1">
          Generate an executive briefing tailored for the <span className="text-indigo-400 font-medium">{audienceLabel}</span> role.
        </p>
      </div>

      {!canRun && (
        <div className="rounded-md border border-yellow-800 bg-yellow-950 px-4 py-3 text-sm text-yellow-300">
          Complete both Signal Collection and Data Analysis before generating narratives.
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!canRun || loading}
        className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
      >
        {loading ? "Generating..." : `Generate ${audienceLabel} Briefing`}
      </button>

      {error && (
        <div className="rounded-md bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <LoadingOverlay
          message={`Framing intelligence for the ${audienceLabel}...`}
        />
      )}

      {result && !loading && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-indigo-400">
              {audienceLabel} Briefing
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full border border-indigo-800 text-indigo-400">
              Prism Intelligence
            </span>
          </div>
          <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {result.briefing}
          </div>
        </div>
      )}
    </div>
  );
}
