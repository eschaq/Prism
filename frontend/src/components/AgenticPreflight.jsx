import React, { useState, useRef } from "react";
import { X } from "lucide-react";
import prismLogo from "../assets/prism-logo.png";
import prismBg from "../assets/prism-backround.png";

const ACCEPTED_EXTENSIONS = [".csv", ".txt", ".md"];

function isAcceptedFile(name) {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export default function AgenticPreflight({ profile, onRun, onBack }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [query, setQuery] = useState(() => {
    const industry = profile?.industry || "";
    return industry
      ? industry.toLowerCase().replace(/&/g, "").replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim() + " tools"
      : "";
  });
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  // Read saved sources for display
  let savedSubreddits = [];
  try {
    const stored = localStorage.getItem("prism_subreddits");
    if (stored) savedSubreddits = JSON.parse(stored).filter((s) => s.checked).map((s) => s.name);
  } catch { /* ignore */ }

  let savedFeeds = [];
  try {
    const stored = localStorage.getItem("prism_feeds");
    if (stored) savedFeeds = JSON.parse(stored).filter((f) => f.checked).map((f) => {
      try { return new URL(f.url).hostname.replace(/^www\./, ""); } catch { return f.url; }
    });
  } catch { /* ignore */ }

  function addFiles(fileList) {
    const newFiles = Array.from(fileList).filter((f) => {
      if (!isAcceptedFile(f.name)) return false;
      return !files.some((existing) => existing.name === f.name && existing.size === f.size);
    });
    if (newFiles.length > 0) setFiles((prev) => [...prev, ...newFiles]);
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const accepted = Array.from(e.dataTransfer.files).filter((f) => isAcceptedFile(f.name));
    if (accepted.length > 0) addFiles(accepted);
  }

  const hasFiles = files.length > 0;
  const stepCount = hasFiles ? 5 : 3;

  function handleRun() {
    if (!query.trim()) return;
    onRun({ query: query.trim(), files: hasFiles ? files : [] });
  }

  return (
    <div className="relative min-h-screen bg-surface text-on-surface font-body overflow-hidden">
      {/* Background */}
      <img src={prismBg} alt="" className="absolute inset-0 w-full h-full object-cover object-center opacity-35 pointer-events-none z-0" />
      <div className="fixed inset-0 dot-matrix pointer-events-none z-0" />
      <div className="fixed top-[-10%] left-[10%] w-[600px] h-[600px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-8 py-5 flex items-center justify-between">
        <button onClick={onBack} className="hover:opacity-80 transition-opacity">
          {logoFailed ? (
            <span className="material-symbols-outlined text-[#5C6BC0] text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              filter_center_focus
            </span>
          ) : (
            <img src={prismLogo} alt="Prism" className="h-12 w-auto" onError={() => setLogoFailed(true)} />
          )}
        </button>
        <button
          onClick={onBack}
          className="rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface-variant font-label text-xs transition-all px-4 py-2"
        >
          Back
        </button>
      </div>

      <main className="max-w-2xl mx-auto px-8 pt-28 pb-16 relative z-10">
        {/* Header */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-label mb-4">
            <span className="material-symbols-outlined text-sm">bolt</span>
            AGENTIC MODE
          </div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface mb-3 font-headline">
            Configure Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary">Run.</span>
          </h1>
          <p className="text-on-surface-variant text-base leading-relaxed">
            Confirm your search query and optionally add data files. Prism will run everything automatically.
          </p>
        </header>

        {/* Query field */}
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest mb-2">Search Query</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl bg-surface-container-lowest border border-outline-variant/20 px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body"
              placeholder="e.g. business intelligence dashboard tools"
            />
          </div>

          {/* Sources summary */}
          {(savedSubreddits.length > 0 || savedFeeds.length > 0) && (
            <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-4 backdrop-blur-[12px]" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
              <p className="text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">Sources to scan</p>
              <div className="flex flex-wrap gap-1.5">
                {savedSubreddits.map((s) => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full border border-primary/20 text-primary bg-primary/5">
                    r/{s}
                  </span>
                ))}
                {savedFeeds.map((f) => (
                  <span key={f} className="text-[10px] px-2 py-0.5 rounded-full border border-tertiary/20 text-tertiary bg-tertiary/5">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* File upload */}
          <div>
            <label className="block text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Data Files <span className="text-outline font-normal normal-case">(optional)</span>
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                dragOver
                  ? "border-primary/40 bg-primary/10"
                  : "border-outline-variant bg-surface-container-low hover:border-outline-variant"
              }`}
            >
              <p className="text-xs text-on-surface-variant">
                Drop <span className="text-primary font-medium">.csv</span>, <span className="text-primary font-medium">.txt</span>, or <span className="text-primary font-medium">.md</span> files here
              </p>
              <p className="text-[10px] text-outline mt-1">
                Add files for a full 5-step analysis, or skip for signals + visibility + briefing only
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.txt,.md"
                multiple
                className="hidden"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
            </div>

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {files.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary"
                  >
                    {f.name}
                    <button type="button" onClick={() => removeFile(i)} className="text-outline hover:text-on-surface-variant transition-colors">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={!query.trim()}
            className="w-full bg-[#5C6BC0] text-white py-3 rounded-xl font-label font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-sm">bolt</span>
            {hasFiles ? `Run Full Pipeline (${stepCount} steps)` : `Run Without Data (${stepCount} steps)`}
          </button>

          {/* Step preview */}
          <div className="flex items-center justify-center gap-2 text-[10px] font-label text-outline uppercase tracking-widest">
            {hasFiles
              ? "Market Intelligence → Data Insights → Opportunity Gaps → AI Search Presence → Executive Briefing"
              : "Market Intelligence → AI Search Presence → Executive Briefing"}
          </div>
        </div>
      </main>
    </div>
  );
}
