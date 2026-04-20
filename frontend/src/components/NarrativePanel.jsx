import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Download, Mail, X, ChevronDown, ChevronUp, Share2 } from "lucide-react";
import { StepProgress, Spinner } from "./LoadingStates";
import AUDIENCES from "../audiences";

const PROSE_CLASSES = "prose prose-sm prose-invert prose-headings:text-on-surface prose-headings:text-sm prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4 prose-p:text-on-surface-variant prose-p:leading-relaxed prose-strong:text-on-surface prose-ul:text-on-surface-variant prose-ol:text-on-surface-variant prose-li:text-on-surface-variant max-w-none";

export default function NarrativePanel({ apiBase, audience, profile, signals, analysis, gaps, visibility, onNarrative, onBriefLoadingChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedNotion, setCopiedNotion] = useState(false);
  const [copiedSlack, setCopiedSlack] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpAnswer, setFollowUpAnswer] = useState(null);
  const [followUpError, setFollowUpError] = useState(null);
  const [compareAudience, setCompareAudience] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);
  const [allBriefs, setAllBriefs] = useState(null);
  const [allBriefsLoading, setAllBriefsLoading] = useState(false);
  const [allBriefsError, setAllBriefsError] = useState(null);
  const [allBriefsProgress, setAllBriefsProgress] = useState(0);
  const [expandedBrief, setExpandedBrief] = useState(null);
  const [expandedCopied, setExpandedCopied] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const progressTimer = useRef(null);

  // Bubble loading state to parent for tour
  useEffect(() => { onBriefLoadingChange?.(loading); }, [loading]);

  const canRun = !!(signals || analysis);
  const audienceLabel = AUDIENCES.find((a) => a.id === audience)?.label ?? audience;
  const compareLabel = AUDIENCES.find((a) => a.id === compareAudience)?.label ?? compareAudience;

  async function handleGenerate() {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveQuestion(null);
    setFollowUpAnswer(null);
    setFollowUpError(null);
    setCompareAudience(null);
    setCompareResult(null);
    setCompareError(null);
    try {
      const res = await fetch(`${apiBase}/api/narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience, signals, analysis, gaps, profile, visibility }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      if (onNarrative) onNarrative(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateAll() {
    if (!canRun) return;
    setAllBriefsLoading(true);
    setAllBriefsError(null);
    setAllBriefs(null);
    setExpandedBrief(null);
    setAllBriefsProgress(0);
    // Simulate progress — advance every 4 seconds
    progressTimer.current = setInterval(() => {
      setAllBriefsProgress((prev) => Math.min(prev + 1, AUDIENCES.length - 1));
    }, 4000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000); // 5 min timeout
    try {
      const res = await fetch(`${apiBase}/api/narrative/all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signals, analysis, gaps, profile, visibility }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAllBriefs(data.briefs);
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        setAllBriefsError("Request timed out after 5 minutes. Click the button to retry.");
      } else {
        setAllBriefsError(err.message);
      }
    } finally {
      clearInterval(progressTimer.current);
      setAllBriefsLoading(false);
      setAllBriefsProgress(0);
    }
  }

  function getPreview(text) {
    if (!text) return "";
    const sentences = text.replace(/^[#*\s]+/gm, "").split(/(?<=[.!?])\s+/);
    return sentences.slice(0, 2).join(" ");
  }

  async function handleCompare() {
    if (!compareAudience) return;
    setCompareLoading(true);
    setCompareResult(null);
    setCompareError(null);
    try {
      const res = await fetch(`${apiBase}/api/narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: compareAudience, signals, analysis, gaps, profile, visibility }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCompareResult(data);
    } catch (err) {
      setCompareError(err.message);
    } finally {
      setCompareLoading(false);
    }
  }

  async function handleFollowUp(question) {
    setActiveQuestion(question);
    setFollowUpLoading(true);
    setFollowUpAnswer(null);
    setFollowUpError(null);
    try {
      const res = await fetch(`${apiBase}/api/narrative/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          question,
          briefing: result.briefing,
          signals,
          analysis,
          gaps,
          profile,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setFollowUpAnswer(data.answer);
    } catch (err) {
      setFollowUpError(err.message);
    } finally {
      setFollowUpLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result.briefing).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleCopyNotion() {
    const notionText = result.briefing
      .replace(/^###\s+(.+)$/gm, "$1")
      .replace(/^##\s+(.+)$/gm, "$1")
      .replace(/^#\s+(.+)$/gm, "$1");
    navigator.clipboard.writeText(notionText).then(() => {
      setCopiedNotion(true);
      setTimeout(() => setCopiedNotion(false), 2000);
    });
  }

  function handleCopySlack() {
    const lines = result.briefing
      .replace(/^#{1,3}\s+/gm, "")
      .replace(/\*\*/g, "*")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
    let slackText = lines.join("\n");
    const maxLen = 500 - "\n\nFull brief in Prism".length;
    if (slackText.length > maxLen) {
      slackText = slackText.slice(0, maxLen).replace(/\n[^\n]*$/, "") + "...";
    }
    slackText += "\n\nFull brief in Prism";
    navigator.clipboard.writeText(slackText).then(() => {
      setCopiedSlack(true);
      setTimeout(() => setCopiedSlack(false), 2000);
    });
  }

  function handleCopyShare() {
    const title = `${audienceLabel} Briefing — Prism Intelligence`;
    const paragraphs = result.briefing
      .replace(/^#{1,3}\s+/gm, "")
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p);
    const preview = paragraphs.slice(0, 3).join("\n\n");
    const shareText = `${title}\n\n${preview}\n\n---\nGenerated by Prism Intelligence — Try it free at https://huggingface.co/spaces/prism-intelligence/prism`;
    navigator.clipboard.writeText(shareText).then(() => {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    });
  }

  function markdownToHtml(md) {
    return md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Headers
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      // Bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // Bullet lists
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")
      // Numbered lists
      .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
      // Paragraphs (lines not already wrapped)
      .replace(/^(?!<[hul]|<li)(.+)$/gm, "<p>$1</p>")
      // Clean up empty paragraphs
      .replace(/<p>\s*<\/p>/g, "");
  }

  function handleDownloadPDF() {
    const title = `${audienceLabel} Briefing`;
    const briefingHtml = markdownToHtml(result.briefing);
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${title} — Prism Intelligence</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Manrope:wght@500;700&display=swap" rel="stylesheet">
<style>
  @page { margin: 48px 56px; }
  body { font-family: 'Inter', -apple-system, sans-serif; color: #1a1a2e; margin: 0; padding: 0; line-height: 1.7; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #aebaff; }
  .header-left h1 { font-family: 'Manrope', sans-serif; font-size: 22px; font-weight: 800; color: #0c0e14; margin: 0 0 4px 0; letter-spacing: -0.02em; }
  .header-left .subtitle { font-size: 11px; color: #717583; font-family: 'Manrope', sans-serif; text-transform: uppercase; letter-spacing: 0.1em; }
  .header-right { text-align: right; }
  .header-right .brand { font-family: 'Manrope', sans-serif; font-size: 14px; font-weight: 700; color: #4d5b9c; }
  .header-right .date { font-size: 10px; color: #a7aab9; margin-top: 2px; }
  .badge { display: inline-block; font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 3px 10px; border-radius: 4px; background: #f0f1ff; color: #4d5b9c; margin-bottom: 16px; }
  h1 { font-family: 'Manrope', sans-serif; font-size: 18px; font-weight: 700; color: #0c0e14; margin: 28px 0 8px 0; letter-spacing: -0.01em; }
  h2 { font-family: 'Manrope', sans-serif; font-size: 15px; font-weight: 700; color: #283575; margin: 24px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #e8e9f0; }
  h3 { font-family: 'Manrope', sans-serif; font-size: 13px; font-weight: 700; color: #334080; margin: 20px 0 6px 0; }
  p { margin: 0 0 10px 0; color: #2a2a3e; }
  ul { margin: 0 0 12px 0; padding-left: 20px; }
  li { margin-bottom: 6px; color: #2a2a3e; }
  strong { color: #0c0e14; font-weight: 700; }
  em { color: #4d5b9c; font-style: italic; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e8e9f0; display: flex; justify-content: space-between; align-items: center; }
  .footer-text { font-size: 9px; color: #a7aab9; font-family: 'Manrope', sans-serif; text-transform: uppercase; letter-spacing: 0.08em; }
  .footer-badge { font-size: 9px; color: #4d5b9c; font-family: 'Manrope', sans-serif; font-weight: 700; }
</style></head><body>
<div class="header">
  <div class="header-left">
    <h1 style="font-size:22px;border:none;margin:0 0 4px 0;padding:0;">${title}</h1>
    <div class="subtitle">Prism Enterprise Intelligence Platform</div>
  </div>
  <div class="header-right">
    <div class="brand">◆ Prism</div>
    <div class="date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </div>
</div>
<div class="badge">AI-Generated Intelligence Brief</div>
${briefingHtml}
<div class="footer">
  <span class="footer-text">Confidential · Generated by Prism Intelligence</span>
  <span class="footer-badge">prism.ai</span>
</div>
</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-10000px";
    iframe.style.left = "-10000px";
    iframe.style.width = "800px";
    iframe.style.height = "600px";
    document.body.appendChild(iframe);

    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();

    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    setTimeout(() => document.body.removeChild(iframe), 1000);
  }

  function handleEmail() {
    const subject = encodeURIComponent(`Prism Intelligence Briefing — ${audienceLabel}`);
    const maxBodyLength = 1800;
    let bodyText = result.briefing;
    if (bodyText.length > maxBodyLength) {
      bodyText = bodyText.slice(0, maxBodyLength) + "\n\n[Briefing truncated — paste full text from Prism]";
    }
    const body = encodeURIComponent(bodyText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  const isComparing = !!compareResult;

  // Decision Readiness Score
  let readinessScore = 0;
  const contributions = [];
  const missingInputs = [];

  if (signals) { readinessScore += 2; contributions.push("Signals"); }
  else { missingInputs.push("Signals"); }
  if (analysis) { readinessScore += 2; contributions.push("Data"); }
  else { missingInputs.push("Data"); }
  if (gaps) { readinessScore += 2; contributions.push("Gaps"); }
  else { missingInputs.push("Gaps"); }
  if (visibility) { readinessScore += 2; contributions.push("Visibility"); }
  else { missingInputs.push("Visibility"); }
  if (profile?.companyName) { readinessScore += 1; contributions.push("Profile"); }
  else { missingInputs.push("Profile"); }
  if (profile?.competitors) { readinessScore += 1; contributions.push("Competitors"); }
  else { missingInputs.push("Competitors"); }

  const readinessTier = readinessScore >= 8 ? "Ready" : readinessScore >= 6 ? "Strong" : readinessScore >= 4 ? "Partial" : "Limited";
  const readinessColor = readinessScore >= 6
    ? "text-secondary border-secondary/20 bg-secondary/10"
    : readinessScore >= 4
    ? "text-tertiary border-tertiary/20 bg-tertiary/10"
    : "text-error border-error-container bg-error-container/20";
  const [readinessText, readinessBorder, readinessBg] = readinessColor.split(" ");
  const readinessLabelColor = readinessScore >= 6
    ? "text-secondary border-secondary/20"
    : readinessScore >= 4
    ? "text-tertiary border-tertiary/20"
    : "text-error border-error-container";

  return (
    <div className={`space-y-6 ${isComparing ? "max-w-5xl" : "max-w-4xl"}`}>
      <p className="text-sm text-on-surface-variant/70 italic leading-relaxed">You've done the work. Now pick your audience and click Generate. Prism will write a complete executive briefing tailored to exactly what that person needs to hear — in their language, at their level.</p>

      {/* Decision Readiness Score */}
      <div className={`rounded-xl border p-5 ${readinessBorder} ${readinessBg}`}>
        <div className="flex items-center gap-4">
          <div className={`text-3xl font-bold ${readinessText}`}>
            {readinessScore}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-on-surface">Decision Readiness</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${readinessLabelColor}`}>
                {readinessTier} — {readinessScore}/10
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Contributing: {contributions.length > 0 ? contributions.join(", ") : "None"}
            </p>
            {missingInputs.length > 0 && (
              <p className="text-[10px] text-outline mt-0.5">
                Add {missingInputs.join(", ")} to strengthen
              </p>
            )}
          </div>
        </div>
      </div>

      {!canRun && (
        <div className="rounded-md bg-tertiary/10 border border-tertiary/20 px-4 py-3 text-sm text-tertiary">
          Run Market Intelligence or Data Insights first to generate a briefing.
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          data-tour-id="narrative-generate"
          disabled={!canRun || loading}
          className="bg-[#5C6BC0] text-white px-6 py-2.5 rounded-xl font-label font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-40"
        >
          {loading ? "Generating..." : `Generate ${audienceLabel} Briefing`}
        </button>
        <div className="relative group/all">
          <button
            onClick={handleGenerateAll}
            disabled={!canRun || allBriefsLoading}
            className="rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface font-label text-xs transition-all px-4 py-2.5 hover:border-primary/30 hover:text-primary disabled:opacity-40 flex items-center gap-1.5"
          >
            {allBriefsLoading && <Spinner size="sm" />}
            {allBriefsLoading ? `Generating ${allBriefsProgress + 1} of ${AUDIENCES.length}...` : `Generate All ${AUDIENCES.length} Briefs`}
          </button>
          <span className="invisible group-hover/all:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-[10px] text-on-surface bg-surface-container-high border border-outline-variant shadow-lg whitespace-nowrap z-50">
            Generates {AUDIENCES.length} briefings sequentially — may take 3-5 minutes.
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-error-container/20 border border-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </div>
      )}

      {loading && (
        <StepProgress
          steps={[
            "Assembling intelligence context...",
            "Generating executive briefing with AI...",
          ]}
          active={loading}
        />
      )}

      {result && !loading && (() => {
        const sourcesPresent = [signals, analysis, gaps, visibility].filter(Boolean).length;
        const qualityCount = sourcesPresent + 1; // +1 for narrative itself
        const missingNames = [];
        if (!signals) missingNames.push("signals");
        if (!analysis) missingNames.push("data");
        if (!gaps) missingNames.push("gaps");
        if (!visibility) missingNames.push("visibility");
        const qualityTier = qualityCount >= 5 ? "Complete" : qualityCount >= 4 ? "Strong" : qualityCount >= 3 ? "Partial" : "Limited";
        const qualityColor = qualityCount >= 4
          ? "text-secondary border-secondary/20"
          : qualityCount >= 3
          ? "text-tertiary border-tertiary/20"
          : "text-error border-error-container";

        return (
        <>
          {/* Heading row + compare dropdown */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-primary">
                {audienceLabel} Briefing
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full border border-primary/20 text-primary">
                Prism Intelligence
              </span>
              <span className="text-xs text-outline">
                ~{Math.ceil(result.briefing.split(/\s+/).length / 200)} min read
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${qualityColor}`}>
                {qualityTier} — {qualityCount}/5
              </span>
              {missingNames.length > 0 && (
                <span className="text-xs text-outline">
                  add {missingNames.join(", ")} to strengthen
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={compareAudience || ""}
                onChange={(e) => {
                  setCompareAudience(e.target.value || null);
                  setCompareResult(null);
                  setCompareError(null);
                }}
                className="rounded-md bg-surface-container-lowest border border-outline-variant/20 px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body"
              >
                <option value="">Compare with...</option>
                {AUDIENCES.filter((a) => a.id !== audience).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCompare}
                disabled={!compareAudience || compareLoading}
                className="inline-flex items-center gap-1.5 bg-[#5C6BC0] text-white px-3 py-1.5 rounded-xl font-label font-bold text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {compareLoading && <Spinner size="sm" />}
                {compareLoading ? "Comparing..." : "Compare"}
              </button>
            </div>
          </div>

          {compareError && (
            <div className="rounded-md bg-error-container/20 border border-error-container px-4 py-3 text-sm text-on-error-container">
              {compareError}
            </div>
          )}

          {/* Follow-up question chips */}
          {result.follow_up_questions?.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-on-surface-variant">What would you ask next?</p>
              <div className="flex flex-wrap gap-2">
                {result.follow_up_questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleFollowUp(q)}
                    disabled={followUpLoading}
                    className={`inline-flex items-center gap-1.5 text-left text-xs px-3 py-2 rounded-lg border transition-colors ${
                      activeQuestion === q
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
                    } disabled:opacity-50`}
                  >
                    {followUpLoading && activeQuestion === q && <Spinner size="sm" />}
                    {q}
                  </button>
                ))}
              </div>

              {followUpError && (
                <div className="rounded-md bg-error-container/20 border border-error-container px-4 py-3 text-sm text-on-error-container">
                  {followUpError}
                </div>
              )}

              {followUpAnswer && (
                <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px]" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs font-medium text-primary font-label">{activeQuestion}</p>
                    <button
                      onClick={() => { setFollowUpAnswer(null); setActiveQuestion(null); }}
                      className="text-[10px] text-outline hover:text-on-surface-variant transition-colors shrink-0 ml-2"
                    >
                      Dismiss
                    </button>
                  </div>
                  <div className={PROSE_CLASSES}>
                    <ReactMarkdown>{followUpAnswer}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Briefing text — side by side when comparing */}
          {isComparing ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px]" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
                <p className="text-xs font-medium text-primary font-label mb-3">{audienceLabel}</p>
                <div className={PROSE_CLASSES}>
                  <ReactMarkdown>{result.briefing}</ReactMarkdown>
                </div>
              </div>
              <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px]" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
                <p className="text-xs font-medium text-primary font-label mb-3">{compareLabel}</p>
                <div className={PROSE_CLASSES}>
                  <ReactMarkdown>{compareResult.briefing}</ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px]" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
              <div className={PROSE_CLASSES}>
                <ReactMarkdown>{result.briefing}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Export buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                copied
                  ? "border-secondary/30 text-secondary"
                  : "border-outline-variant text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
              }`}
            >
              <Copy size={14} />
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface font-label text-xs transition-all px-3 py-1.5"
            >
              <Download size={14} />
              Download PDF
            </button>
            <button
              onClick={handleEmail}
              className="inline-flex items-center gap-1.5 rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface font-label text-xs transition-all px-3 py-1.5"
            >
              <Mail size={14} />
              Email Draft
            </button>
            <button
              onClick={handleCopyNotion}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                copiedNotion
                  ? "border-secondary/30 text-secondary"
                  : "border-outline-variant text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
              }`}
            >
              <Copy size={14} />
              {copiedNotion ? "Copied" : "Notion"}
            </button>
            <button
              onClick={handleCopySlack}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                copiedSlack
                  ? "border-secondary/30 text-secondary"
                  : "border-outline-variant text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
              }`}
            >
              <Copy size={14} />
              {copiedSlack ? "Copied" : "Slack"}
            </button>
            <button
              onClick={handleCopyShare}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                copiedShare
                  ? "border-secondary/30 text-secondary"
                  : "border-outline-variant text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
              }`}
            >
              <Share2 size={14} />
              {copiedShare ? "Copied!" : "Share"}
            </button>
          </div>

          {/* Evidence Trail */}
          <div>
            <button
              onClick={() => setShowEvidence(!showEvidence)}
              className="inline-flex items-center gap-1 text-xs text-outline hover:text-on-surface-variant transition-colors"
            >
              {showEvidence ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showEvidence ? "Hide evidence trail" : "Show evidence trail"}
            </button>

            {showEvidence && (() => {
              // Signal source breakdown
              const posts = signals?.raw_posts || [];
              const redditCount = posts.filter((p) => p.source?.startsWith("r/")).length;
              const webCount = posts.filter((p) => p.source?.startsWith("web:")).length;
              const rssCount = posts.length - redditCount - webCount;
              const subs = signals?.subreddits || [];
              const feeds = signals?.rss_feeds || [];

              // Data inputs
              const fileCount = analysis?.file_count || 0;
              const rows = analysis?.shape?.rows || 0;
              const cols = analysis?.shape?.columns || 0;
              const inputType = analysis?.input_type;
              const textLen = analysis?.text_length;
              const columns = analysis?.columns || [];

              // Gap findings
              const gapData = typeof gaps?.gaps === "object" && gaps?.gaps !== null ? gaps.gaps : null;
              const alignCount = gapData?.alignments?.length || 0;
              const gapCount = gapData?.gaps?.length || 0;
              const blindCount = gapData?.blind_spots?.length || 0;
              const recCount = gapData?.recommendations?.length || 0;
              const ccCount = gapData?.competitive_contrast?.length || 0;
              const maScore = gapData?.messaging_alignment?.score;
              const msThreat = gapData?.mindshare_risk?.top_threat;

              // Visibility
              const visAssessments = visibility?.assessments;
              const visCount = Array.isArray(visAssessments) ? visAssessments.length : 0;
              const visVisible = Array.isArray(visAssessments) ? visAssessments.filter((a) => a.visibility === "Visible").length : 0;
              const visPartial = Array.isArray(visAssessments) ? visAssessments.filter((a) => a.visibility === "Partially Visible").length : 0;
              const visNot = Array.isArray(visAssessments) ? visAssessments.filter((a) => a.visibility === "Not Visible").length : 0;

              const hasSignals = signals != null;
              const hasAnalysis = analysis != null;
              const hasGaps = gapData != null;
              const hasVis = visCount > 0;

              return (
                <div className="mt-3 rounded-xl border border-[rgba(174,186,255,0.08)] p-5 backdrop-blur-[12px] space-y-4" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
                  <p className="text-[10px] font-label text-outline uppercase tracking-widest">Evidence Trail</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Signal Sources */}
                    {hasSignals && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-primary">Signal Sources</p>
                        {redditCount > 0 && (
                          <p className="text-[11px] text-on-surface-variant">
                            {redditCount} Reddit posts from {subs.map((s) => `r/${s}`).join(", ")}
                          </p>
                        )}
                        {rssCount > 0 && (
                          <p className="text-[11px] text-on-surface-variant">{rssCount} RSS items</p>
                        )}
                        {webCount > 0 && (
                          <p className="text-[11px] text-on-surface-variant">{webCount} web search results</p>
                        )}
                        <p className="text-[10px] text-outline">{posts.length} total posts analyzed</p>
                      </div>
                    )}

                    {/* Data Inputs */}
                    {hasAnalysis && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-primary">Data Inputs</p>
                        {inputType === "text" ? (
                          <p className="text-[11px] text-on-surface-variant">Text input — {textLen?.toLocaleString()} characters</p>
                        ) : (
                          <p className="text-[11px] text-on-surface-variant">
                            {fileCount} file{fileCount !== 1 ? "s" : ""} — {rows.toLocaleString()} rows × {cols} columns
                          </p>
                        )}
                        {columns.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {columns.slice(0, 5).map((col) => (
                              <span key={col} className="text-[9px] px-1.5 py-0.5 rounded border border-outline-variant/30 text-outline">
                                {col}
                              </span>
                            ))}
                            {columns.length > 5 && (
                              <span className="text-[9px] text-outline">+{columns.length - 5} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Gap Analysis */}
                    {hasGaps && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-primary">Opportunity Gaps</p>
                        <p className="text-[11px] text-on-surface-variant">
                          {alignCount} alignments, {gapCount} gaps, {blindCount} blind spots, {recCount} recommendations
                          {ccCount > 0 && `, ${ccCount} competitive contrasts`}
                        </p>
                        {maScore != null && (
                          <p className="text-[10px] text-outline">Messaging alignment: {maScore}/10</p>
                        )}
                        {msThreat && (
                          <p className="text-[10px] text-outline">Top mindshare threat: {msThreat}</p>
                        )}
                      </div>
                    )}

                    {/* AI Visibility */}
                    {hasVis && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-primary">AI Search Presence</p>
                        <p className="text-[11px] text-on-surface-variant">{visCount} entities assessed</p>
                        <p className="text-[10px] text-outline">
                          {visVisible > 0 && `${visVisible} visible`}
                          {visVisible > 0 && (visPartial > 0 || visNot > 0) && ", "}
                          {visPartial > 0 && `${visPartial} partial`}
                          {visPartial > 0 && visNot > 0 && ", "}
                          {visNot > 0 && `${visNot} not visible`}
                        </p>
                      </div>
                    )}

                  </div>
                </div>
              );
            })()}
          </div>
        </>
        );
      })()}

      {/* All Briefs error */}
      {allBriefsError && (
        <div className="rounded-md bg-error-container/20 border border-error-container px-4 py-3 text-sm text-on-error-container">
          {allBriefsError}
        </div>
      )}

      {/* All Briefs grid */}
      {allBriefs && !allBriefsLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-on-surface">All Audience Briefs</h3>
            <span className="text-[10px] font-label text-outline">
              {allBriefs.filter((b) => b.briefing).length} of {allBriefs.length} generated
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allBriefs.map((brief) => {
              const roleLabel = AUDIENCES.find((a) => a.id === brief.audience)?.label ?? brief.audience;
              const wordCount = brief.briefing ? brief.briefing.split(/\s+/).length : 0;
              const readTime = Math.ceil(wordCount / 200);
              const preview = getPreview(brief.briefing);

              return (
                <div
                  key={brief.audience}
                  className="rounded-xl border border-[rgba(174,186,255,0.08)] p-4 backdrop-blur-[12px] space-y-2"
                  style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-on-surface font-headline">{roleLabel}</span>
                    {brief.briefing ? (
                      <span className="text-[10px] text-outline">~{readTime} min</span>
                    ) : (
                      <span className="text-[10px] text-error">Failed</span>
                    )}
                  </div>
                  {brief.briefing ? (
                    <>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-3">
                        {preview}
                      </p>
                      <button
                        onClick={() => setExpandedBrief(brief.audience === expandedBrief ? null : brief.audience)}
                        className="text-[10px] font-label text-primary hover:text-primary-fixed transition-colors"
                      >
                        {expandedBrief === brief.audience ? "Close" : "View Full Brief"}
                      </button>
                    </>
                  ) : (
                    <p className="text-[10px] text-error/70">{brief.error}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Expanded brief */}
          {expandedBrief && (() => {
            const brief = allBriefs.find((b) => b.audience === expandedBrief);
            if (!brief?.briefing) return null;
            const roleLabel = AUDIENCES.find((a) => a.id === brief.audience)?.label ?? brief.audience;

            return (
              <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px] space-y-4" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-primary">{roleLabel} Briefing</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-primary/20 text-primary">
                      Prism Intelligence
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(brief.briefing).then(() => {
                          setExpandedCopied(true);
                          setTimeout(() => setExpandedCopied(false), 2000);
                        });
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                        expandedCopied
                          ? "border-secondary/30 text-secondary"
                          : "border-outline-variant text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
                      }`}
                    >
                      <Copy size={12} />
                      {expandedCopied ? "Copied" : "Copy"}
                    </button>
                    <button
                      onClick={() => setExpandedBrief(null)}
                      className="rounded-md border border-outline-variant p-1.5 text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className={PROSE_CLASSES}>
                  <ReactMarkdown>{brief.briefing}</ReactMarkdown>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
