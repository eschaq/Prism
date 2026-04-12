import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { StepProgress } from "./LoadingStates";

const VISIBILITY_COLORS = {
  Visible: "text-green-400 border-green-800 bg-green-950",
  "Partially Visible": "text-yellow-400 border-yellow-800 bg-yellow-950",
  "Not Visible": "text-red-400 border-red-800 bg-red-950",
};

const SOM_COLORS = {
  Visible: "text-green-400",
  "Partially Visible": "text-yellow-400",
  "Not Visible": "text-red-400",
};

const READINESS_COLORS = {
  High: "text-green-400 border-green-800",
  Medium: "text-yellow-400 border-yellow-800",
  Low: "text-red-400 border-red-800",
};

export default function VisibilityPanel({ apiBase, profile, onVisibility }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [expandedQueries, setExpandedQueries] = useState(new Set());
  const [showMethodology, setShowMethodology] = useState(false);

  const hasCompany = !!profile?.companyName;
  const competitorsRaw = profile?.competitors || "";
  const competitors = competitorsRaw.split(",").map((c) => c.trim()).filter(Boolean);
  const canRun = hasCompany && competitors.length > 0;

  async function handleRun() {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    setExpandedQueries(new Set());
    setShowMethodology(false);
    try {
      const res = await fetch(`${apiBase}/api/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: profile.companyName,
          industry: profile.industry || "General",
          competitors,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      if (onVisibility) onVisibility(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleQueries(index) {
    setExpandedQueries((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-100">AI Visibility</h2>
        <p className="text-sm text-gray-400 mt-1">
          Assess your Share of Model — how visible your company and competitors are in AI-generated search responses.
        </p>
      </div>

      {!canRun && (
        <div className="rounded-md border border-yellow-800 bg-yellow-950 px-4 py-3 text-sm text-yellow-300">
          Configure your company name and competitors in Profile Settings to run AI visibility assessment.
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={!canRun || loading}
        className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
      >
        {loading ? "Assessing..." : "Run Visibility Assessment"}
      </button>

      {error && (
        <div className="rounded-md bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <StepProgress
          steps={[
            "Preparing visibility analysis...",
            "Assessing AI search presence...",
          ]}
          active={loading}
        />
      )}

      {result && !loading && (
        Array.isArray(result.assessments) ? (
          <div className="space-y-4">
            {result.assessments.map((a, i) => {
              const tierColor = VISIBILITY_COLORS[a.visibility] || VISIBILITY_COLORS["Not Visible"];
              const somColor = SOM_COLORS[a.visibility] || SOM_COLORS["Not Visible"];
              const queriesExpanded = expandedQueries.has(i);
              return (
                <div key={i} className="rounded-lg border border-gray-800 bg-gray-900 p-5 space-y-3">
                  <div className="flex items-center gap-4">
                    {a.estimated_som_percentage && (
                      <div className={`text-2xl font-bold ${somColor} flex-shrink-0`}>
                        {a.estimated_som_percentage}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-100">
                          {a.entity}
                          {a.is_primary_company && (
                            <span className="ml-2 text-xs font-normal text-indigo-400">(You)</span>
                          )}
                        </h3>
                        <div className="flex items-center gap-1.5">
                          {a.agentic_readiness && (
                            <span className={`text-xs px-2.5 py-0.5 rounded-full border ${READINESS_COLORS[a.agentic_readiness] || READINESS_COLORS.Low}`}>
                              Agentic: {a.agentic_readiness}
                            </span>
                          )}
                          <span className={`text-xs px-2.5 py-0.5 rounded-full border ${tierColor}`}>
                            {a.visibility}
                          </span>
                        </div>
                      </div>
                      {a.estimated_som_percentage && (
                        <p className="text-xs text-gray-500 mt-0.5">Share of Model</p>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-300">{a.rationale}</p>

                  {a.query_patterns_tested?.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleQueries(i)}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {queriesExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {queriesExpanded ? "Hide" : "Show"} query patterns
                      </button>
                      {queriesExpanded && (
                        <ol className="mt-2 space-y-1 text-xs text-gray-500 list-decimal list-inside">
                          {a.query_patterns_tested.map((q, j) => (
                            <li key={j}>{q}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}

                  {a.strengths?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-400 mb-1">Strengths</p>
                      <ul className="text-xs text-gray-400 space-y-0.5">
                        {a.strengths.map((s, j) => (
                          <li key={j} className="flex items-start gap-1.5">
                            <span className="text-green-600 mt-0.5">+</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {a.gaps?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-400 mb-1">Gaps</p>
                      <ul className="text-xs text-gray-400 space-y-0.5">
                        {a.gaps.map((g, j) => (
                          <li key={j} className="flex items-start gap-1.5">
                            <span className="text-red-600 mt-0.5">-</span>
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {a.content_recommendations?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-indigo-400 mb-1">Recommendations</p>
                      <div className="space-y-1.5">
                        {a.content_recommendations.map((rec, j) => (
                          <div key={j} className="rounded-md border border-indigo-800 bg-indigo-950 px-3 py-2">
                            <p className="text-xs text-gray-300">
                              <span className="text-indigo-400 font-medium mr-1">{j + 1}.</span>
                              {rec}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {result.query_patterns_evaluated?.length > 0 && (
              <div className="border-t border-gray-800 pt-4">
                <button
                  onClick={() => setShowMethodology(!showMethodology)}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showMethodology ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  Evaluation methodology
                </button>
                {showMethodology && (
                  <div className="mt-2 rounded-lg border border-gray-800 bg-gray-900 p-4">
                    <p className="text-xs text-gray-500 mb-2">Each entity was evaluated against these buyer-intent query patterns:</p>
                    <ol className="space-y-1 text-xs text-gray-500 list-decimal list-inside">
                      {result.query_patterns_evaluated.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
            <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {typeof result.assessments === "string" ? result.assessments : JSON.stringify(result, null, 2)}
            </div>
          </div>
        )
      )}
    </div>
  );
}
