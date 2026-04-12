import React, { useState, useRef } from "react";
import { X } from "lucide-react";
import { StepProgress, Spinner } from "./LoadingStates";
import DEMO_DATASETS from "../demo_datasets";

export default function DataPanel({ apiBase, profile, onAnalysis }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const [showDemoPicker, setShowDemoPicker] = useState(false);
  const [selectedDemos, setSelectedDemos] = useState(new Set());
  const [loadingDemos, setLoadingDemos] = useState(false);

  function addFiles(fileList) {
    const newFiles = Array.from(fileList).filter((f) => {
      if (!f.name.toLowerCase().endsWith(".csv")) return false;
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
    const csvFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith(".csv")
    );
    if (csvFiles.length > 0) {
      addFiles(csvFiles);
    } else {
      setError("Please upload .csv files.");
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
          return new File([blob], d.filename, { type: "text/csv" });
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

  async function handleAnalyze() {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div
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
          Drop <span className="text-primary font-medium">.csv</span> files here, or click to browse
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowDemoPicker(!showDemoPicker)}
          className="rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface font-label text-xs transition-all px-4 py-2 hover:border-primary/30 hover:text-primary"
        >
          {showDemoPicker ? "Hide Demo Data" : "Load Demo Data"}
        </button>
      </div>

      {showDemoPicker && (
        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6 space-y-4">
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

      {files.length > 0 && (
        <div className="space-y-3">
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
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-[#5C6BC0] text-white px-6 py-2.5 rounded-xl font-label font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? "Analyzing..." : `Analyze ${files.length} file${files.length !== 1 ? "s" : ""}`}
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
            files.length > 1
              ? `Uploading and parsing ${files.length} CSVs...`
              : "Uploading and parsing CSV...",
            "Analyzing column patterns...",
            "Generating business summary with AI...",
          ]}
          active={loading}
        />
      )}

      {result && !loading && (
        <div className="space-y-4">
          <div className="text-xs text-outline">
            {(result.file_count || 1) > 1 && `${result.file_count} files merged · `}
            {result.shape?.rows} rows · {result.shape?.columns} columns
          </div>

          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
            <h3 className="text-sm font-semibold text-primary mb-3">Business Summary</h3>
            <div className="text-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed">
              {result.summary}
            </div>
          </div>

          {result.preview?.length > 0 && (
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6 overflow-x-auto">
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
