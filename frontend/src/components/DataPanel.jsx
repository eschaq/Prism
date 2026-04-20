import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { X, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { StepProgress, Spinner } from "./LoadingStates";
import DEMO_DATASETS from "../demo_datasets";

const PROSE_CLASSES = "prose prose-sm prose-invert prose-headings:text-on-surface prose-headings:text-sm prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4 prose-p:text-on-surface-variant prose-p:leading-relaxed prose-strong:text-on-surface prose-ul:text-on-surface-variant prose-ol:text-on-surface-variant prose-li:text-on-surface-variant max-w-none";

const ACCEPTED_EXTENSIONS = [".csv", ".txt", ".md"];

function isAcceptedFile(name) {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export default function DataPanel({ apiBase, profile, onAnalysis, onDataLoadedChange, onAnalysisLoadingChange }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const [showDemoPicker, setShowDemoPicker] = useState(false);
  const [selectedDemos, setSelectedDemos] = useState(new Set());
  const [loadingDemos, setLoadingDemos] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [showPasteArea, setShowPasteArea] = useState(false);

  // Bubble data-loaded state to parent for tour
  useEffect(() => { onDataLoadedChange?.(files.length > 0); }, [files]);

  // Bubble loading state to parent for tour
  useEffect(() => { onAnalysisLoadingChange?.(loading); }, [loading]);

  function addFiles(fileList) {
    const newFiles = Array.from(fileList).filter((f) => {
      if (!isAcceptedFile(f.name)) return false;
      return !files.some((existing) => existing.name === f.name && existing.size === f.size);
    });
    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles]);
    }
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const accepted = Array.from(e.dataTransfer.files).filter((f) => isAcceptedFile(f.name));
    if (accepted.length > 0) {
      addFiles(accepted);
    } else {
      setError("Please upload .csv, .txt, or .md files.");
    }
  }

  function toggleDemo(id) {
    setSelectedDemos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleLoadDemos() {
    if (selectedDemos.size === 0) return;
    setLoadingDemos(true);
    setError(null);
    try {
      const datasets = DEMO_DATASETS.filter((d) => selectedDemos.has(d.id));
      const fetched = await Promise.all(
        datasets.map(async (d) => {
          const res = await fetch(`${apiBase}/api/demo-data/${d.filename}`);
          if (!res.ok) throw new Error(`Failed to load ${d.filename}`);
          const blob = await res.blob();
          const basename = d.filename.split("/").pop();
          const mimeType = basename.endsWith(".csv") ? "text/csv" : "text/plain";
          return new File([blob], basename, { type: mimeType });
        })
      );
      setFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const newFiles = fetched.filter((f) => !existingNames.has(f.name));
        return [...prev, ...newFiles];
      });
      setShowDemoPicker(false);
      setSelectedDemos(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDemos(false);
    }
  }

  const hasFiles = files.length > 0;
  const hasText = pastedText.trim().length > 0;
  const canAnalyze = hasFiles || hasText;

  function getButtonLabel() {
    if (loading) return "Analyzing...";
    const parts = [];
    if (hasFiles) parts.push(`${files.length} file${files.length !== 1 ? "s" : ""}`);
    if (hasText) parts.push("text");
    return `Analyze ${parts.join(" + ")}`;
  }

  async function handleAnalyze() {
    if (!canAnalyze) return;
    setLoading(true);
    setError(null);
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    if (hasText) form.append("text", pastedText.trim());
    if (profile) form.append("profile", JSON.stringify(profile));
    try {
      const res = await fetch(`${apiBase}/api/analyze`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      onAnalysis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const isTextResult = result?.input_type === "text";
  const isMixedResult = result?.input_type === "mixed";

  return (
    <div className="space-y-6 max-w-4xl">
      <p className="text-sm text-on-surface-variant/70 italic leading-relaxed">Show Prism what you're working with. Upload your CSV files, paste meeting notes or call summaries, or load one of our demo datasets. This step is optional — skip it if you only want market signals.</p>

      {/* File drop zone */}
      <div
        data-tour-id="data-upload"
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver
            ? "border-primary/40 bg-primary/10"
            : "border-outline-variant bg-surface-container-low hover:border-outline-variant"
        }`}
      >
        <p className="text-sm text-on-surface-variant">
          Drop <span className="text-primary font-medium">.csv</span>, <span className="text-primary font-medium">.txt</span>, or <span className="text-primary font-medium">.md</span> files here, or click to browse
        </p>
        <p className="text-[10px] text-outline mt-1">Upload CSV files for data analysis, or add text files and notes for qualitative insights.</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,.md"
          multiple
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-outline">
        <Lock size={10} />
        <span>Your data is processed securely and never stored on our servers. Uploaded files and pasted text are analyzed in memory and discarded after processing.</span>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowDemoPicker(!showDemoPicker)}
          className="rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface font-label text-xs transition-all px-4 py-2 hover:border-primary/30 hover:text-primary"
        >
          {showDemoPicker ? "Hide Demo Data" : "Load Demo Data"}
        </button>
        <button
          type="button"
          onClick={() => setShowPasteArea(!showPasteArea)}
          className="inline-flex items-center gap-1 rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface font-label text-xs transition-all px-4 py-2 hover:border-primary/30 hover:text-primary"
        >
          {showPasteArea ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Paste text
        </button>
      </div>

      {/* Demo picker */}
      {showDemoPicker && (
        <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px] space-y-4" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
          <p className="text-xs font-medium text-on-surface-variant">Select demo datasets to load</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEMO_DATASETS.map((d) => {
              const isSelected = selectedDemos.has(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDemo(d.id)}
                  className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                    isSelected
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-outline-variant bg-surface-container-high text-on-surface-variant hover:border-outline-variant"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="h-3 w-3 rounded border-outline-variant bg-surface-container-high text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-medium">{d.label}</div>
                      <div className="text-xs text-outline">{d.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={handleLoadDemos}
            disabled={selectedDemos.size === 0 || loadingDemos}
            className="inline-flex items-center gap-1.5 bg-[#5C6BC0] text-white px-6 py-2.5 rounded-xl font-label font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {loadingDemos && <Spinner size="sm" />}
            {loadingDemos ? "Loading..." : `Load ${selectedDemos.size} Selected`}
          </button>
        </div>
      )}

      {/* Paste textarea */}
      {showPasteArea && (
        <div className="space-y-2">
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={6}
            className="w-full rounded-xl bg-surface-container-lowest border border-outline-variant/20 px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body resize-y"
            placeholder="Paste meeting notes, support tickets, sales call summaries, or any text to analyze..."
          />
          <p className="text-[10px] text-outline text-right">
            {pastedText.length.toLocaleString()} characters
          </p>
        </div>
      )}

      {/* File chips + analyze button */}
      {(hasFiles || hasText) && (
        <div className="space-y-3">
          {hasFiles && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <span
                  key={`${f.name}-${i}`}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary"
                >
                  {f.name}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-outline hover:text-on-surface-variant transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {hasText && !hasFiles && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-tertiary/40 bg-tertiary/10 text-tertiary">
              <span className="material-symbols-outlined text-xs">notes</span>
              Pasted text ({pastedText.length.toLocaleString()} chars)
            </span>
          )}
          <button
            onClick={handleAnalyze}
            data-tour-id="data-analyze"
            disabled={loading || !canAnalyze}
            className="bg-[#5C6BC0] text-white px-6 py-2.5 rounded-xl font-label font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {getButtonLabel()}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-error-container/20 border border-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </div>
      )}

      {loading && (
        <StepProgress
          steps={[
            hasText && !hasFiles
              ? "Uploading and parsing text..."
              : hasFiles && files.length > 1
              ? `Uploading and parsing ${files.length} files...`
              : "Uploading and parsing file...",
            "Analyzing patterns...",
            "Generating business summary with AI...",
          ]}
          active={loading}
        />
      )}

      {result && !loading && (
        <div className="space-y-4">
          <div className="text-xs text-outline">
            {isTextResult ? (
              <>
                {result.source_files?.length > 0 && `${result.source_files.join(", ")} · `}
                {result.text_length?.toLocaleString()} characters analyzed
              </>
            ) : isMixedResult ? (
              <>
                {result.file_count} files · {result.shape?.rows} rows · {result.shape?.columns} columns + {result.text_length?.toLocaleString()} chars text
              </>
            ) : (
              <>
                {(result.file_count || 1) > 1 && `${result.file_count} files merged · `}
                {result.shape?.rows} rows · {result.shape?.columns} columns
              </>
            )}
          </div>

          <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px]" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
            <h3 className="text-sm font-semibold text-primary mb-3">Business Summary</h3>
            <div className={PROSE_CLASSES}>
              <ReactMarkdown>{result.summary}</ReactMarkdown>
            </div>
          </div>

          {!isTextResult && result.preview?.length > 0 && (
            <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px] overflow-x-auto" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
              <h3 className="text-xs font-semibold text-on-surface-variant mb-3">Data Preview</h3>
              <table className="text-xs text-on-surface-variant w-full">
                <thead>
                  <tr>
                    {Object.keys(result.preview[0]).map((col) => (
                      <th key={col} className="text-left pr-4 pb-2 text-outline font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.preview.map((row, i) => (
                    <tr key={i} className="border-t border-outline-variant/10">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="pr-4 py-1 truncate max-w-[120px]">
                          {String(val ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
