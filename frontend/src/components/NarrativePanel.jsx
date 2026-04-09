import React, { useState } from "react";
import { LoadingOverlay } from "./LoadingStates";

const AUDIENCES = [
  { id: "cfo", label: "CFO", description: "Financial risk, ROI, capital allocation" },
  { id: "operations", label: "Operations", description: "Efficiency, process, delivery" },
  { id: "marketing", label: "Marketing", description: "Brand, sentiment, positioning" },
  { id: "sales", label: "Sales", description: "Pipeline, objections, buyer pain points" },
];

export default function NarrativePanel({ apiBase, signals, analysis, gaps }) {
  const [audience, setAudience] = useState("cfo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const canRun = signals && analysis;

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
          Generate audience-specific executive briefings from your signals and data.
        </p>
      </div>

      {!canRun && (
        <div className="rounded-md border border-yellow-800 bg-yellow-950 px-4 py-3 text-sm text-yellow-300">
          Complete both Signal Collection and Data Analysis before generating narratives.
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-gray-400 mb-2">Select audience</p>
        <div className="grid grid-cols-2 gap-3">
          {AUDIENCES.map((a) => (
            <button
              key={a.id}
              onClick={() => setAudience(a.id)}
              className={`text-left rounded-lg border px-4 py-3 transition-colors ${
                audience === a.id
                  ? "border-indigo-500 bg-indigo-950 text-indigo-300"
                  : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600"
              }`}
            >
              <div className="font-medium text-sm">{a.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{a.description}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!canRun || loading}
        className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
      >
        {loading ? "Generating..." : `Generate ${AUDIENCES.find((a) => a.id === audience)?.label} Briefing`}
      </button>

      {error && (
        <div className="rounded-md bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <LoadingOverlay
          message={`Framing intelligence for the ${AUDIENCES.find((a) => a.id === audience)?.label}...`}
        />
      )}

      {result && !loading && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-indigo-400">
              {AUDIENCES.find((a) => a.id === result.audience)?.label} Briefing
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
