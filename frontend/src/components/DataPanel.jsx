import React, { useState, useRef } from "react";
import { LoadingOverlay } from "./LoadingStates";

export default function DataPanel({ apiBase, onAnalysis }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  async function uploadFile(file) {
    if (!file) return;
    setLoading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
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

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) uploadFile(file);
    else setError("Please upload a .csv file.");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-100">Data Analysis</h2>
        <p className="text-sm text-gray-400 mt-1">
          Upload a CSV and get a plain-English business summary from Claude.
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
          Drop a <span className="text-indigo-400 font-medium">.csv</span> here, or click to browse
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => uploadFile(e.target.files[0])}
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && <LoadingOverlay message="Analyzing your data with Claude..." />}

      {result && !loading && (
        <div className="space-y-4">
          <div className="text-xs text-gray-500">
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
