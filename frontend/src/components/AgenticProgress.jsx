import React, { useState, useEffect, useRef } from "react";
import { Spinner } from "./LoadingStates";
import { STEP_META } from "../paths";
const prismLogo = "/assets/prism-logo.png";
const prismBg = "/assets/prism-backround.png";

const PIPELINE_STEPS = ["signals", "analysis", "gaps", "visibility", "narrative"];
const STEP_LABELS = {
  signals: STEP_META.signals.label,
  analysis: STEP_META.data.label,
  gaps: STEP_META.gaps.label,
  visibility: STEP_META.visibility.label,
  narrative: STEP_META.narrative.label,
};

const SIMULATE_INTERVAL_MS = 5000;

export default function AgenticProgress({ stepsStatus, running, onCancel }) {
  const [simulatedStep, setSimulatedStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);
  const simTimer = useRef(null);
  const elapsedTimer = useRef(null);

  // Elapsed timer
  useEffect(() => {
    if (running) {
      setElapsed(0);
      elapsedTimer.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(elapsedTimer.current);
  }, [running]);

  // Simulated step advancement
  useEffect(() => {
    if (running && !stepsStatus) {
      setSimulatedStep(0);
      simTimer.current = setInterval(() => {
        setSimulatedStep((prev) => Math.min(prev + 1, PIPELINE_STEPS.length - 1));
      }, SIMULATE_INTERVAL_MS);
    }
    return () => clearInterval(simTimer.current);
  }, [running]);

  // Stop simulation when real results arrive
  useEffect(() => {
    if (stepsStatus) {
      clearInterval(simTimer.current);
    }
  }, [stepsStatus]);

  function formatElapsed(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function getStepStatus(stepId, index) {
    // Use real status if available
    if (stepsStatus && stepsStatus[stepId]) {
      return stepsStatus[stepId];
    }
    // Simulated status
    if (!running) return { status: "pending" };
    if (index < simulatedStep) return { status: "completed" };
    if (index === simulatedStep) return { status: "running" };
    return { status: "pending" };
  }

  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <img src={prismBg} alt="" className="absolute inset-0 w-full h-full object-cover object-center opacity-35 pointer-events-none z-0" />
      <div className="fixed inset-0 dot-matrix pointer-events-none z-0" />
      <div className="fixed top-[-10%] left-[10%] w-[600px] h-[600px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-lg w-full px-8">
        {/* Logo */}
        <div className="mb-2">
          {logoFailed ? (
            <span className="material-symbols-outlined text-[#5C6BC0] text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              filter_center_focus
            </span>
          ) : (
            <img
              src={prismLogo}
              alt="Prism"
              className="h-20 w-auto"
              onError={() => setLogoFailed(true)}
            />
          )}
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tighter text-on-surface font-headline mb-2">
            {stepsStatus ? "Pipeline Complete" : "Running Full Pipeline"}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary">.</span>
          </h1>
          <p className="text-on-surface-variant text-sm">
            {stepsStatus
              ? "All steps finished. Preparing your intelligence report."
              : "Sit back — Prism is running all five intelligence steps automatically."}
          </p>
        </div>

        {/* Step list */}
        <div className="w-full rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px] space-y-1" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
          {PIPELINE_STEPS.map((stepId, i) => {
            const stepStatus = getStepStatus(stepId, i);
            const isCompleted = stepStatus.status === "completed";
            const isRunning = stepStatus.status === "running";
            const isFailed = stepStatus.status === "failed";
            const isSkipped = stepStatus.status === "skipped";
            const isPending = stepStatus.status === "pending";

            return (
              <div key={stepId} className="flex items-center gap-4 py-3">
                {/* Status icon */}
                <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                  {isCompleted && (
                    <div className="w-7 h-7 rounded-full bg-secondary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary text-sm">check</span>
                    </div>
                  )}
                  {isRunning && <Spinner size="sm" />}
                  {isFailed && (
                    <div className="w-7 h-7 rounded-full bg-error/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-error text-sm">close</span>
                    </div>
                  )}
                  {isSkipped && (
                    <div className="w-7 h-7 rounded-full bg-outline-variant/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-outline text-sm">remove</span>
                    </div>
                  )}
                  {isPending && (
                    <div className="w-7 h-7 rounded-full border border-outline-variant bg-surface-container-high" />
                  )}
                </div>

                {/* Label + detail */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    isCompleted ? "text-secondary"
                    : isRunning ? "text-primary"
                    : isFailed ? "text-error"
                    : isSkipped ? "text-outline"
                    : "text-on-surface-variant/50"
                  }`}>
                    {STEP_LABELS[stepId]}
                  </p>
                  {isFailed && stepStatus.error && (
                    <p className="text-[10px] text-error/70 truncate">{stepStatus.error}</p>
                  )}
                  {isSkipped && stepStatus.reason && (
                    <p className="text-[10px] text-outline truncate">{stepStatus.reason}</p>
                  )}
                </div>

                {/* Duration */}
                {stepStatus.duration_ms != null && (
                  <span className="text-[10px] text-outline font-label tabular-nums">
                    {(stepStatus.duration_ms / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Elapsed timer */}
        <p className="text-xs text-outline tabular-nums">{formatElapsed(elapsed)}</p>

        {/* Cancel button */}
        {running && !stepsStatus && (
          <button
            onClick={onCancel}
            className="rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface-variant font-label text-xs transition-all px-6 py-2"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
