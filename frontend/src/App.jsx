import React, { useState } from "react";
import { Settings } from "lucide-react";
import AUDIENCES from "./audiences";
import { PATHS } from "./paths";
import DEMO_CONFIG from "./demo";
import RoleSelector from "./components/RoleSelector";
import PathSelector from "./components/PathSelector";
import ProfileSettings from "./components/ProfileSettings";
import Wizard from "./components/Wizard";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const STORAGE_KEY = "prism_profile";

function loadProfile() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
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

  // Screen 1: Role selection
  if (!audience) {
    return (
      <>
        <RoleSelector onSelect={setAudience} profile={profile} onOpenSettings={() => setShowSettings(true)} onLoadDemo={handleLoadDemo} />
        {showSettings && (
          <ProfileSettings
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
    return <PathSelector audienceLabel={audienceLabel} onSelect={setPath} />;
  }

  const activePath = PATHS.find((p) => p.id === path);
  const pathLabel = activePath?.label ?? path;

  function handleChangeRole() {
    setAudience(null);
    setPath(null);
  }

  function handleChangePath() {
    setPath(null);
  }

  // Screen 3: Wizard
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-indigo-400">Prism</span>
              <span className="ml-2 text-sm font-normal text-gray-400">
                Enterprise Intelligence Platform
              </span>
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              One source of truth. Every audience, perfectly framed.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-300">
                <span className="text-xs text-gray-500 mr-1">Role:</span>
                <span className="font-medium text-indigo-400">{audienceLabel}</span>
              </div>
              <div className="text-sm text-gray-300">
                <span className="text-xs text-gray-500 mr-1">Path:</span>
                <span className="font-medium text-indigo-400">{pathLabel}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={handleChangeRole}
                className="rounded-md border border-gray-700 px-3 py-1 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
              >
                Change role
              </button>
              <button
                onClick={handleChangePath}
                className="rounded-md border border-gray-700 px-3 py-1 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
              >
                Change path
              </button>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="relative rounded-md border border-gray-700 p-2 text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
              title="Company Profile Settings"
            >
              <Settings size={16} />
              {profile && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-gray-950" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <Wizard
          steps={activePath.steps}
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
          profile={profile}
          onSave={handleSaveProfile}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
