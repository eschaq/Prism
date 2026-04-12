import React, { useState, useEffect, useRef } from "react";
import AUDIENCES from "./audiences";
import { PATHS, STEP_META } from "./paths";
import DEMO_CONFIG from "./demo";
import RoleSelector from "./components/RoleSelector";
import PathSelector from "./components/PathSelector";
import ProfileSettings from "./components/ProfileSettings";
import Wizard from "./components/Wizard";
import { Spinner } from "./components/LoadingStates";
import prismLogo from "./assets/prism-logo.png";
import prismBg from "./assets/prism-backround.png";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const STORAGE_KEY = "prism_profile";

const STEP_ICONS = {
  signals: "settings_input_antenna",
  data: "leaderboard",
  gaps: "compare_arrows",
  visibility: "visibility",
  narrative: "description",
};

function loadProfile() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function PrismLogo() {
  const [imgFailed, setImgFailed] = useState(false);
  if (imgFailed) {
    return (
      <span className="material-symbols-outlined text-[#5C6BC0] text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
        filter_center_focus
      </span>
    );
  }
  return (
    <img
      src={prismLogo}
      alt="Prism"
      className="h-24 w-auto"
      onError={() => setImgFailed(true)}
    />
  );
}

export default function App() {
  const [audience, setAudience] = useState(null);
  const [path, setPath] = useState(null);
  const [signals, setSignals] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [gaps, setGaps] = useState(null);
  const [narrative, setNarrative] = useState(null);
  const [visibility, setVisibility] = useState(null);
  const [profile, setProfile] = useState(loadProfile);
  const [showSettings, setShowSettings] = useState(false);
  const [demoConfig, setDemoConfig] = useState(null);

  // Lifted wizard state
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [paused, setPaused] = useState(false);
  const advanceTimer = useRef(null);
  const countdownTimer = useRef(null);

  function handleSaveProfile(data) {
    setProfile(data);
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function handleLoadDemo() {
    handleSaveProfile(DEMO_CONFIG.profile);
    setAudience(DEMO_CONFIG.audience);
    setPath(DEMO_CONFIG.path);
    setDemoConfig({ subreddits: DEMO_CONFIG.subreddits, query: DEMO_CONFIG.query });
  }

  // Completion map
  const completionMap = {
    signals: signals !== null,
    data: analysis !== null,
    gaps: gaps !== null,
    narrative: narrative !== null,
    visibility: visibility !== null,
  };

  const activePath = path ? PATHS.find((p) => p.id === path) : null;
  const steps = activePath?.steps || [];
  const activeStep = steps[activeIndex] || null;
  const nextStep = activeIndex < steps.length - 1 ? steps[activeIndex + 1] : null;
  const nextStepLabel = nextStep ? STEP_META[nextStep]?.label : null;

  function canNavigate(index) {
    if (index === 0) return true;
    for (let i = 0; i < index; i++) {
      if (!completionMap[steps[i]]) return false;
    }
    return true;
  }

  function advanceNow() {
    clearTimeout(advanceTimer.current);
    clearInterval(countdownTimer.current);
    setTransitioning(false);
    setCountdown(0);
    setPaused(false);
    setActiveIndex((prev) => prev + 1);
  }

  function togglePause() {
    if (paused) {
      countdownTimer.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(countdownTimer.current); return 0; }
          return prev - 1;
        });
      }, 1000);
      advanceTimer.current = setTimeout(() => {
        clearInterval(countdownTimer.current);
        setTransitioning(false);
        setCountdown(0);
        setPaused(false);
        setActiveIndex((prev) => prev + 1);
      }, countdown * 1000);
      setPaused(false);
    } else {
      clearTimeout(advanceTimer.current);
      clearInterval(countdownTimer.current);
      setPaused(true);
    }
  }

  useEffect(() => {
    if (!activeStep || !steps.length) return;
    const currentStep = steps[activeIndex];
    if (completionMap[currentStep] && activeIndex < steps.length - 1) {
      setTransitioning(true);
      setPaused(false);
      setCountdown(10);
      countdownTimer.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(countdownTimer.current); return 0; }
          return prev - 1;
        });
      }, 1000);
      advanceTimer.current = setTimeout(() => {
        clearInterval(countdownTimer.current);
        setTransitioning(false);
        setCountdown(0);
        setActiveIndex(activeIndex + 1);
      }, 10000);
    }
    return () => {
      clearTimeout(advanceTimer.current);
      clearInterval(countdownTimer.current);
    };
  }, [signals, analysis, gaps, narrative, visibility]);

  // Screen 1: Role selection
  if (!audience) {
    return (
      <>
        <RoleSelector onSelect={setAudience} profile={profile} onOpenSettings={() => setShowSettings(true)} onLoadDemo={handleLoadDemo} />
        {showSettings && (
          <ProfileSettings
            apiBase={API_BASE}
            profile={profile}
            onSave={handleSaveProfile}
            onClose={() => setShowSettings(false)}
          />
        )}
      </>
    );
  }

  const audienceLabel = AUDIENCES.find((a) => a.id === audience)?.label ?? audience;

  // Screen 2: Path selection
  if (!path) {
    return <PathSelector audienceLabel={audienceLabel} onSelect={setPath} onHome={() => setAudience(null)} />;
  }

  const pathLabel = activePath?.label ?? path;

  function handleChangeRole() {
    setAudience(null);
    setPath(null);
    setActiveIndex(0);
  }

  function handleChangePath() {
    setPath(null);
    setActiveIndex(0);
  }

  // Screen 3: Wizard with sidebar
  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      {/* Background image + effects */}
      <img src={prismBg} alt="" className="fixed inset-0 w-full h-full object-cover opacity-50 pointer-events-none z-0" />
      <div className="fixed inset-0 dot-matrix pointer-events-none z-0" />
      <div className="fixed top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-tertiary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Top nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#0c0e14]/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-8 h-20 flex justify-between items-center">
        <button onClick={handleChangeRole} className="flex items-center hover:opacity-80 transition-opacity">
          <PrismLogo />
        </button>
        <div className="hidden md:flex gap-6 items-center">
          <span className="font-label text-xs font-bold text-on-surface-variant px-3 py-1 bg-surface-container-low rounded border border-outline-variant/20">
            {audienceLabel}
          </span>
          <span className="font-label text-xs font-bold text-on-surface-variant px-3 py-1 bg-surface-container-low rounded border border-outline-variant/20">
            {pathLabel}
          </span>
          <button
            onClick={handleChangeRole}
            className="text-on-surface-variant hover:text-white transition-colors font-body font-bold tracking-tight text-sm"
          >
            Change role
          </button>
          <button
            onClick={handleChangePath}
            className="text-on-surface-variant hover:text-white transition-colors font-body font-bold tracking-tight text-sm"
          >
            Change path
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSettings(true)}
            className="relative p-2 text-on-surface-variant hover:text-white hover:bg-surface-container-low rounded-lg transition-all"
          >
            <span className="material-symbols-outlined">settings</span>
            {profile && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-secondary" />
            )}
          </button>
        </div>
      </nav>

      {/* Side nav */}
      <aside className="fixed left-0 top-20 h-[calc(100vh-80px)] w-64 bg-[#0c0e14] border-r border-[#1c1e26] flex flex-col p-4 gap-2 z-40">
        <div className="mb-6 px-2">
          <p className="text-[10px] font-label text-primary font-bold uppercase tracking-widest mb-1">Active Modules</p>
          <h3 className="text-lg font-extrabold tracking-tight text-on-surface font-headline">
            Intelligence{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Synthesized.
            </span>
          </h3>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          {steps.map((stepId, i) => {
            const meta = STEP_META[stepId];
            const isComplete = completionMap[stepId];
            const isActive = i === activeIndex;
            const clickable = canNavigate(i) && !transitioning && !paused;
            const icon = STEP_ICONS[stepId] || "circle";

            return (
              <button
                key={stepId}
                onClick={() => clickable && setActiveIndex(i)}
                disabled={!clickable}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
                  isActive
                    ? "bg-surface-container-low text-[#5C6BC0] border-l-4 border-[#5C6BC0]"
                    : isComplete
                    ? "text-secondary hover:bg-surface-container-low hover:text-white"
                    : clickable
                    ? "text-on-surface-variant hover:bg-surface-container-low hover:text-white"
                    : "text-on-surface-variant/40 cursor-not-allowed"
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {isComplete ? "check_circle" : icon}
                </span>
                <div>
                  <span className="font-body text-sm font-medium block">{meta.label}</span>
                  <span className="font-label text-[10px] text-on-surface-variant/60 block">{meta.description}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Transition countdown */}
        {transitioning && nextStepLabel && (
          <div className="mx-2 mb-2 rounded-xl border border-[rgba(174,186,255,0.08)] p-3 space-y-2 backdrop-blur-[12px]" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
            <div className="flex items-center gap-2">
              {!paused && <Spinner size="sm" />}
              <span className="text-[11px] text-on-surface-variant font-label">
                {paused ? `Paused — ${countdown}s` : `Next in ${countdown}s...`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={togglePause}
                className="flex-1 rounded-lg border border-outline-variant/30 px-2 py-1 text-[10px] font-label text-on-surface-variant hover:text-white hover:bg-surface-container transition-colors"
              >
                {paused ? "Resume" : "Pause"}
              </button>
              <button
                onClick={advanceNow}
                className="flex-1 rounded-lg bg-[#5C6BC0]/20 px-2 py-1 text-[10px] font-label text-[#5C6BC0] hover:bg-[#5C6BC0]/30 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Bottom tools */}
        <div className="mt-auto pt-4 border-t border-outline-variant/20">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-white transition-all w-full text-left"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            <span className="font-body text-xs font-medium">Profile Settings</span>
            {profile && (
              <span className="ml-auto h-2 w-2 rounded-full bg-secondary" />
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 mt-20 p-8 min-h-[calc(100vh-80px)] relative z-10 overflow-y-auto">
        {/* Hero header */}
        {activeStep && STEP_META[activeStep] && (
          <header className="mb-8 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/10 border border-primary-container/20 text-primary text-xs font-label mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              STEP {activeIndex + 1} OF {steps.length} · {audienceLabel?.toUpperCase()}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface mb-3 font-headline">
              {STEP_META[activeStep].label}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                .
              </span>
            </h1>
            <p className="text-on-surface-variant text-base max-w-2xl leading-relaxed">
              {STEP_META[activeStep].description}
            </p>
          </header>
        )}
        <Wizard
          steps={steps}
          activeIndex={activeIndex}
          apiBase={API_BASE}
          audience={audience}
          profile={profile}
          initialConfig={demoConfig}
          signals={signals}
          analysis={analysis}
          gaps={gaps}
          narrative={narrative}
          visibility={visibility}
          onSignals={setSignals}
          onAnalysis={setAnalysis}
          onGaps={setGaps}
          onNarrative={setNarrative}
          onVisibility={setVisibility}
        />
      </main>

      {showSettings && (
        <ProfileSettings
          apiBase={API_BASE}
          profile={profile}
          onSave={handleSaveProfile}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
