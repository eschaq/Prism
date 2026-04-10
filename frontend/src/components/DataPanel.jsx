import React, { useState, useRef } from "react";
import { X } from "lucide-react";
import { StepProgress } from "./LoadingStates";

export default function DataPanel({ apiBase, profile, onAnalysis }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-100">Data Analysis</h2>
        <p className="text-sm text-gray-400 mt-1">
          Upload one or more CSVs and get a plain-English business summary.
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver
            ? "border-indigo-500 bg-indigo-950"
            : "border-gray-700 bg-gray-900 hover:border-gray-600"
        }`}
      >
        <p className="text-sm text-gray-400">
          Drop <span className="text-indigo-400 font-medium">.csv</span> files here, or click to browse
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

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-indigo-500 bg-indigo-950 text-indigo-300"
              >
                {f.name}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Analyzing..." : `Analyze ${files.length} file${files.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
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
          <div className="text-xs text-gray-500">
            {(result.file_count || 1) > 1 && `${result.file_count} files merged · `}
            {result.shape?.rows} rows · {result.shape?.columns} columns
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
            <h3 className="text-sm font-semibold text-indigo-400 mb-3">Business Summary</h3>
            <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {result.summary}
            </div>
          </div>

          {result.preview?.length > 0 && (
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 overflow-x-auto">
              <h3 className="text-xs font-semibold text-gray-400 mb-3">Data Preview</h3>
              <table className="text-xs text-gray-300 w-full">
                <thead>
                  <tr>
                    {Object.keys(result.preview[0]).map((col) => (
                      <th key={col} className="text-left pr-4 pb-2 text-gray-500 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.preview.map((row, i) => (
                    <tr key={i} className="border-t border-gray-800">
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
