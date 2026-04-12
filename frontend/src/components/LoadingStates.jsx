import React, { useState, useEffect, useRef } from "react";

export function Spinner({ size = "md" }) {
  const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" };
  return (
    <div
      className={`${sizes[size]} animate-spin rounded-full border-2 border-outline border-t-primary`}
    />
  );
}

export function SkeletonBlock({ className = "" }) {
  return (
    <div className={`animate-pulse rounded bg-surface-container-high ${className}`} />
  );
}

export function LoadingOverlay({ message = "Analyzing..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <Spinner size="lg" />
      <p className="text-sm text-on-surface-variant">{message}</p>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6 space-y-3">
      <SkeletonBlock className="h-4 w-1/3" />
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-5/6" />
      <SkeletonBlock className="h-3 w-4/6" />
    </div>
  );
}

const STEP_ADVANCE_MS = 4000;

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function StepProgress({ steps, active }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const advanceRef = useRef(null);

  useEffect(() => {
    if (active) {
      setCurrentStep(0);
      setElapsed(0);

      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      advanceRef.current = setInterval(() => {
        setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      }, STEP_ADVANCE_MS);

      return () => {
        clearInterval(intervalRef.current);
        clearInterval(advanceRef.current);
      };
    } else {
      clearInterval(intervalRef.current);
      clearInterval(advanceRef.current);
      setCurrentStep(steps.length);
    }
  }, [active]);

  return (
    <div className="py-8 flex flex-col items-center gap-4">
      <div className="space-y-3 w-full max-w-sm">
        {steps.map((label, i) => {
          const isComplete = active ? i < currentStep : true;
          const isActive = active && i === currentStep;
          const isUpcoming = active && i > currentStep;

          return (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {isComplete && (
                  <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{"\u2713"}</span>
                  </div>
                )}
                {isActive && <Spinner size="sm" />}
                {isUpcoming && (
                  <div className="w-5 h-5 rounded-full border border-outline-variant bg-surface-container-high" />
                )}
              </div>
              <span
                className={`text-sm ${
                  isComplete
                    ? "text-secondary"
                    : isActive
                    ? "text-primary font-medium"
                    : "text-outline"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      {active && (
        <p className="text-xs text-outline tabular-nums">{formatElapsed(elapsed)}</p>
      )}
    </div>
  );
}
