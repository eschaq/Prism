import React, { useState } from "react";
import { LoadingOverlay } from "./LoadingStates";

const GAP_SECTIONS = [
  { key: "alignments", label: "Alignments", fieldMain: "finding", fieldDetail: "evidence", accent: "border-green-800 bg-green-950", labelColor: "text-green-400" },
  { key: "gaps", label: "Critical Gaps", fieldMain: "finding", fieldDetail: "evidence", accent: "border-red-800 bg-red-950", labelColor: "text-red-400" },
  { key: "blind_spots", label: "Blind Spots", fieldMain: "finding", fieldDetail: "evidence", accent: "border-yellow-800 bg-yellow-950", labelColor: "text-yellow-400" },
  { key: "recommendations", label: "Recommendations", fieldMain: "action", fieldDetail: "rationale", accent: "border-indigo-800 bg-indigo-950", labelColor: "text-indigo-400" },
];

export default function GapAnalysis({ apiBase, profile, signals, analysis, onGaps }) {
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
        body: JSON.stringify({ signals, analysis, profile }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      onGaps(data);
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
        typeof result.gaps === "string" ? (
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
            <h3 className="text-sm font-semibold text-indigo-400 mb-3">Gap Analysis Report</h3>
            <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {result.gaps}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {GAP_SECTIONS.map((section) => {
              const items = result.gaps?.[section.key];
              if (!items?.length) return null;
              return (
                <div key={section.key} className="space-y-3">
                  <h3 className={`text-sm font-semibold ${section.labelColor}`}>
                    {section.label}
                  </h3>
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-4 ${section.accent}`}
                    >
                      <p className="text-sm font-medium text-gray-100">
                        {item[section.fieldMain]}
                      </p>
                      {item[section.fieldDetail] && (
                        <p className="text-xs text-gray-400 mt-1">
                          {item[section.fieldDetail]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
