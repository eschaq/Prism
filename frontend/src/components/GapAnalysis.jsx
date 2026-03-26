import { useState } from "react";
import { LoadingOverlay } from "./LoadingStates";

export default function GapAnalysis({ apiBase, signals, analysis }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const canRun = signals && analysis;

  async function handleRun() {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/gaps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signals, analysis }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-100">Gap Analysis</h2>
        <p className="text-sm text-gray-400 mt-1">
          Cross-reference market signals with internal data to surface misalignments and opportunities.
        </p>
      </div>

      {!canRun && (
        <div className="rounded-md border border-yellow-800 bg-yellow-950 px-4 py-3 text-sm text-yellow-300">
          Complete both Signal Collection and Data Analysis before running gap analysis.
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={!canRun || loading}
        className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
      >
        {loading ? "Analyzing..." : "Run Gap Analysis"}
      </button>

      {error && (
        <div className="rounded-md bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && <LoadingOverlay message="Identifying gaps across signal and data streams..." />}

      {result && !loading && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-indigo-400 mb-3">Gap Analysis Report</h3>
          <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {result.gaps}
          </div>
        </div>
      )}
    </div>
  );
}
