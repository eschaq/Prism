import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { StepProgress } from "./LoadingStates";

const VISIBILITY_COLORS = {
  Visible: "text-secondary border-secondary/20 bg-secondary/10",
  "Partially Visible": "text-tertiary border-tertiary/20 bg-tertiary/10",
  "Not Visible": "text-error border-error-container bg-error-container/20",
};

const SOM_COLORS = {
  Visible: "text-secondary",
  "Partially Visible": "text-tertiary",
  "Not Visible": "text-error",
};

const READINESS_COLORS = {
  High: "text-secondary border-secondary/20",
  Medium: "text-tertiary border-tertiary/20",
  Low: "text-error border-error-container",
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
    <div className="space-y-6 max-w-4xl">
      {!canRun && (
        <div className="rounded-md bg-tertiary/10 border border-tertiary/20 px-4 py-3 text-sm text-tertiary">
          Configure your company name and competitors in Profile Settings to run AI visibility assessment.
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={!canRun || loading}
        className="bg-[#5C6BC0] text-white px-6 py-2.5 rounded-xl font-label font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-40"
      >
        {loading ? "Assessing..." : "Run Visibility Assessment"}
      </button>

      {error && (
        <div className="rounded-md bg-error-container/20 border border-error-container px-4 py-3 text-sm text-on-error-container">
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
                <div key={i} className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6 space-y-3">
                  <div className="flex items-center gap-4">
                    {a.estimated_som_percentage && (
                      <div className={`text-2xl font-bold ${somColor} flex-shrink-0`}>
                        {a.estimated_som_percentage}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-on-surface">
                          {a.entity}
                          {a.is_primary_company && (
                            <span className="ml-2 text-xs font-normal text-primary">(You)</span>
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
                        <p className="text-xs text-outline mt-0.5">Share of Model</p>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-on-surface-variant">{a.rationale}</p>

                  {a.query_patterns_tested?.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleQueries(i)}
                        className="inline-flex items-center gap-1 text-xs text-outline hover:text-on-surface-variant transition-colors"
                      >
                        {queriesExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {queriesExpanded ? "Hide" : "Show"} query patterns
                      </button>
                      {queriesExpanded && (
                        <ol className="mt-2 space-y-1 text-xs text-outline list-decimal list-inside">
                          {a.query_patterns_tested.map((q, j) => (
                            <li key={j}>{q}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}

                  {a.strengths?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-secondary mb-1">Strengths</p>
                      <ul className="text-xs text-on-surface-variant space-y-0.5">
                        {a.strengths.map((s, j) => (
                          <li key={j} className="flex items-start gap-1.5">
                            <span className="text-secondary-dim mt-0.5">+</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {a.gaps?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-error mb-1">Gaps</p>
                      <ul className="text-xs text-on-surface-variant space-y-0.5">
                        {a.gaps.map((g, j) => (
                          <li key={j} className="flex items-start gap-1.5">
                            <span className="text-error-dim mt-0.5">-</span>
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {a.content_recommendations?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-primary mb-1">Recommendations</p>
                      <div className="space-y-1.5">
                        {a.content_recommendations.map((rec, j) => (
                          <div key={j} className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2">
                            <p className="text-xs text-on-surface-variant">
                              <span className="text-primary font-medium mr-1">{j + 1}.</span>
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
              <div className="border-t border-outline-variant/10 pt-4">
                <button
                  onClick={() => setShowMethodology(!showMethodology)}
                  className="inline-flex items-center gap-1 text-xs text-outline hover:text-on-surface-variant transition-colors"
                >
                  {showMethodology ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  Evaluation methodology
                </button>
                {showMethodology && (
                  <div className="mt-2 rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
                    <p className="text-xs text-outline mb-2">Each entity was evaluated against these buyer-intent query patterns:</p>
                    <ol className="space-y-1 text-xs text-outline list-decimal list-inside">
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
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
            <div className="text-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed">
              {typeof result.assessments === "string" ? result.assessments : JSON.stringify(result, null, 2)}
            </div>
          </div>
        )
      )}
    </div>
  );
}
