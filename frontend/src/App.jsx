import React, { useState } from "react";
import AUDIENCES from "./audiences";
import { PATHS } from "./paths";
import RoleSelector from "./components/RoleSelector";
import PathSelector from "./components/PathSelector";
import Wizard from "./components/Wizard";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [audience, setAudience] = useState(null);
  const [path, setPath] = useState(null);
  const [signals, setSignals] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [gaps, setGaps] = useState(null);
  const [narrative, setNarrative] = useState(null);

  // Screen 1: Role selection
  if (!audience) {
    return <RoleSelector onSelect={setAudience} />;
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
          </div>
        </div>
      </header>

      <main className="p-6">
        <Wizard
          steps={activePath.steps}
          apiBase={API_BASE}
          audience={audience}
          signals={signals}
          analysis={analysis}
          gaps={gaps}
          narrative={narrative}
          onSignals={setSignals}
          onAnalysis={setAnalysis}
          onGaps={setGaps}
          onNarrative={setNarrative}
        />
      </main>
    </div>
  );
}
