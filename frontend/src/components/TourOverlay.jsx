import React, { useState, useEffect, useRef } from "react";
import { PATHS } from "../paths";

// Each step has a `kind`:
//   meta        — always shown (profile, welcome, role, path)
//   agentic     — shown only when user picked the agentic "Run Everything" flow
//   signals/data/gaps/visibility/narrative — shown only when the chosen path includes that wizard step
const STEPS = [
  {
    kind: "meta",
    title: "Set Up Your Company Profile",
    body: "Before running your first analysis, tell Prism about your company. This personalizes your signal collection and executive briefings. All fields are required.",
    target: "profile",
    trigger: "profileSaved",
  },
  {
    kind: "meta",
    title: "Welcome to Prism",
    body: "Prism turns market signals and internal data into audience-ready intelligence. This tour walks you through your first full analysis.",
    target: null,
    trigger: "timer",
  },
  {
    kind: "meta",
    title: "Pick Your Audience",
    body: "Start by choosing who you're briefing. Each role gets a completely different document from the same data.",
    target: "role-grid",
    trigger: "audience",
  },
  {
    kind: "meta",
    title: "Choose Your Path",
    body: "Pick how deep you want to go. Each path runs a different set of steps — from a quick signal report to a full intelligence briefing.",
    target: "path-grid",
    trigger: "pathOrAgentic",
  },
  {
    kind: "agentic",
    title: "Configure Your Run",
    body: "Enter your search query and optionally upload a CSV. Prism will run the full pipeline automatically — signals, analysis, gaps, visibility, and briefing.",
    target: "agentic-config",
    trigger: "agenticRunning",
  },
  {
    kind: "agentic-progress",
    title: "Prism Is Working",
    body: "Prism is running every step for you — market signals, data analysis, gap finding, AI search visibility, and the final brief. This usually takes about a minute.",
    target: null,
    trigger: "agenticComplete",
  },
  {
    kind: "data",
    title: "Load Your Data",
    body: "Upload a CSV — sales data, product metrics, usage data. Or load the demo dataset to follow along.",
    target: "data-upload",
    trigger: "dataLoaded",
  },
  {
    kind: "signals",
    title: "Define Your Signal Topic",
    body: "Type the market topic you want Prism to monitor — Reddit threads, forums, and community conversations about that space.",
    target: "signal-topic",
    trigger: "signalTopicEntered",
  },
  {
    kind: "signals",
    title: "Run Signal Collection",
    body: "Hit Run Signals. Prism scrapes live market conversations and Claude extracts structured intelligence — complaints, trends, and unmet needs.",
    target: "signals-run",
    trigger: "signalsRunning",
  },
  {
    kind: "data",
    title: "Run Data Analysis",
    body: "Claude reads your CSV and produces a plain-English business summary — no formulas, no pivot tables.",
    target: "data-analyze",
    trigger: "analysisRunning",
  },
  {
    kind: "gaps",
    title: "Find the Gaps",
    body: "Prism cross-references both streams to surface specific opportunities — where market demand meets internal performance gaps.",
    target: "gaps-run",
    trigger: "gapsRunning",
  },
  {
    kind: "visibility",
    title: "Check AI Search Presence",
    body: "See how visible your company is in AI-generated answers — and what your competitors are doing better.",
    target: "visibility-run",
    trigger: "visibilityRunning",
  },
  {
    kind: "narrative",
    title: "Generate Your Brief",
    body: "Prism produces a role-specific document written for your chosen audience. Switch roles anytime to regenerate for a different stakeholder.",
    target: "narrative-generate",
    trigger: null, // final — manual Finish only
  },
];

function getVisibleSteps(currentPath, agenticMode) {
  if (agenticMode) {
    // Agentic: meta steps + agentic config + agentic progress + narrative (final)
    return STEPS.filter(
      (s) =>
        s.kind === "meta" ||
        s.kind === "agentic" ||
        s.kind === "agentic-progress" ||
        s.kind === "narrative"
    );
  }
  if (!currentPath) {
    // Before a path is chosen: only meta steps are relevant
    return STEPS.filter((s) => s.kind === "meta");
  }
  const pathDef = PATHS.find((p) => p.id === currentPath);
  if (!pathDef) return STEPS.filter((s) => s.kind === "meta");
  const includedKinds = new Set(pathDef.steps);
  return STEPS.filter((s) => {
    if (s.kind === "meta") return true;
    if (s.kind === "agentic") return false;
    return includedKinds.has(s.kind);
  });
}

const HIGHLIGHT_CLASS = "prism-tour-highlight";

function clearHighlight() {
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => {
    el.classList.remove(HIGHLIGHT_CLASS);
  });
}

function applyHighlight(target) {
  clearHighlight();
  if (!target) return;
  const el = document.querySelector(`[data-tour-id="${target}"]`);
  if (el) el.classList.add(HIGHLIGHT_CLASS);
}

export default function TourOverlay({
  isOpen,
  onClose,
  onComplete,
  stepIndex,
  setStepIndex,
  profileSaved = false,
  audience = null,
  path = null,
  agenticPreflight = false,
  agenticRunning = false,
  agenticResult = null,
  dataLoaded = false,
  signalTopicEntered = false,
  signalsRunning = false,
  analysisRunning = false,
  gapsRunning = false,
  visibilityRunning = false,
}) {
  const [dontShow, setDontShow] = useState(false);
  const backedOffStepRef = useRef(null);

  const agenticMode = !!(agenticPreflight || agenticRunning || agenticResult);
  const visibleSteps = getVisibleSteps(path, agenticMode);
  const safeIndex = Math.min(Math.max(stepIndex, 0), Math.max(visibleSteps.length - 1, 0));
  const current = visibleSteps[safeIndex];
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === visibleSteps.length - 1;

  useEffect(() => {
    if (!isOpen) setDontShow(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      clearHighlight();
      return;
    }
    applyHighlight(current?.target);
  }, [isOpen, current?.target]);

  useEffect(() => () => clearHighlight(), []);

  // If the visible list shrinks (e.g. path changes), clamp stepIndex.
  useEffect(() => {
    if (stepIndex > visibleSteps.length - 1 && visibleSteps.length > 0) {
      setStepIndex(visibleSteps.length - 1);
    }
  }, [visibleSteps.length, stepIndex, setStepIndex]);

  const triggerValues = {
    profileSaved: !!profileSaved,
    audience: !!audience,
    pathOrAgentic: !!(path || agenticMode),
    agenticRunning: !!(agenticRunning || agenticResult),
    agenticComplete: !!agenticResult && !agenticRunning,
    dataLoaded: !!dataLoaded,
    signalTopicEntered: !!signalTopicEntered,
    signalsRunning: !!signalsRunning,
    analysisRunning: !!analysisRunning,
    gapsRunning: !!gapsRunning,
    visibilityRunning: !!visibilityRunning,
  };

  useEffect(() => {
    if (!isOpen || !current) return;
    if (!current.trigger || current.trigger === "timer") return;
    if (!triggerValues[current.trigger]) return;
    if (backedOffStepRef.current === safeIndex) return;
    setStepIndex((i) => Math.min(i + 1, visibleSteps.length - 1));
  }, [
    isOpen,
    safeIndex,
    current,
    visibleSteps.length,
    triggerValues.profileSaved,
    triggerValues.audience,
    triggerValues.pathOrAgentic,
    triggerValues.agenticRunning,
    triggerValues.agenticComplete,
    triggerValues.dataLoaded,
    triggerValues.signalTopicEntered,
    triggerValues.signalsRunning,
    triggerValues.analysisRunning,
    triggerValues.gapsRunning,
    triggerValues.visibilityRunning,
  ]);

  // Welcome step — 3s timer advance
  useEffect(() => {
    if (!isOpen || !current || current.trigger !== "timer") return;
    const t = setTimeout(() => {
      setStepIndex((i) => Math.min(i + 1, visibleSteps.length - 1));
    }, 3000);
    return () => clearTimeout(t);
  }, [isOpen, current, visibleSteps.length]);

  if (!isOpen || !current) return null;

  function handleNext() {
    backedOffStepRef.current = null;
    if (isLast) {
      localStorage.setItem("prism_tour_completed", "true");
      clearHighlight();
      onComplete();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, visibleSteps.length - 1));
  }

  function handleBack() {
    setStepIndex((i) => {
      const next = Math.max(i - 1, 0);
      backedOffStepRef.current = next;
      return next;
    });
  }

  function handleSkip() {
    if (dontShow) {
      localStorage.setItem("prism_tour_completed", "true");
    }
    clearHighlight();
    onClose();
  }

  return (
    <>
      <style>{`
        .${HIGHLIGHT_CLASS} {
          position: relative;
          outline: 2px solid #71D7CD !important;
          outline-offset: 4px;
          box-shadow: 0 0 0 6px rgba(113, 215, 205, 0.18) !important;
          border-radius: 12px;
          z-index: 45;
          transition: outline-color 0.2s ease, box-shadow 0.2s ease;
        }
      `}</style>

      <div className="fixed bottom-6 left-6 w-[360px] z-[9999] rounded-xl border border-[#E2E5F4] bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5">
            {visibleSteps.map((s, i) => (
              <div
                key={`${s.kind}-${i}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === safeIndex
                    ? "w-6 bg-[#71D7CD]"
                    : i < safeIndex
                    ? "w-1.5 bg-[#71D7CD]/50"
                    : "w-1.5 bg-[#C8CAD8]"
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-bold text-[#71D7CD]">
            {safeIndex + 1} / {visibleSteps.length}
          </span>
        </div>

        <h2 className="text-base font-extrabold tracking-tight text-[#0C0E14] mb-1.5 font-headline">
          {current.title}
        </h2>
        <p className="text-sm text-[#4A4D5E] leading-relaxed mb-5">
          {current.body}
        </p>

        {isFirst && (
          <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="accent-[#71D7CD] h-3.5 w-3.5"
            />
            <span className="text-xs text-[#4A4D5E]">Don't show this again</span>
          </label>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleSkip}
            className="text-xs text-[#A7AAB9] hover:text-[#4A4D5E] transition-colors"
          >
            Skip Tour
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handleBack}
                className="rounded-lg border border-[#E2E5F4] bg-white px-3 py-1.5 text-xs font-semibold text-[#4A4D5E] hover:bg-[#F5F6FA] transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="rounded-lg bg-[#71D7CD] hover:bg-[#5CC3B8] px-4 py-1.5 text-xs font-bold text-[#0C0E14] transition-colors"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
