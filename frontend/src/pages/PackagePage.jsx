import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Copy, Download, Check } from "lucide-react";
import Loading from "../components/Loading";
import {
  customizeResume, writeCoverLetter, downloadDoc, createApplication,
} from "../lib/api";
import { loadState, updateState } from "../lib/store";
import { copyToClipboard } from "../lib/clipboard";

const TABS = [
  { key: "resume", label: "Customized Resume" },
  { key: "cover", label: "Cover Letter" },
  { key: "qa", label: "Quick Answers" },
];

export default function PackagePage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("id");
  // Snapshot state once on mount; refs prevent re-renders from re-running effects.
  const stateRef = useRef(loadState());
  const state = stateRef.current;
  const job = useMemo(
    () => (state.scoreResult?.ranked_jobs || []).find((j) => j.id === id),
    [state.scoreResult, id]
  );
  const [tab, setTab] = useState("resume");
  const [pkg, setPkg] = useState(state.packages?.[id] || null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [saved, setSaved] = useState(false);
  const generatingRef = useRef(false);
  const generatedForIdRef = useRef(state.packages?.[id] ? id : null);

  const generate = async () => {
    if (!job || !state.profile || !state.resumeText) return;
    if (generatingRef.current) return;
    generatingRef.current = true;
    try {
      setBusy(true);
      setStage("Agent 4 — customizing resume...");
      const r = await customizeResume(state.resumeText, state.profile, job);
      setStage("Agent 5 — writing cover letter...");
      const c = await writeCoverLetter(state.profile, job, r.customized_resume);
      const merged = {
        customized_resume: r.customized_resume,
        change_summary: r.change_summary,
        keyword_insertion_map: r.keyword_insertion_map,
        cover_letter: c.cover_letter,
        quick_answers: c.quick_answers,
        tone_used: c.tone_used,
        word_count: c.word_count,
      };
      setPkg(merged);
      generatedForIdRef.current = id;
      const next = loadState();
      updateState({ packages: { ...(next.packages || {}), [id]: merged } });
      toast.success("Application package ready");
    } catch (e) {
      const msg = e?.budgetExceeded ? e.userMessage : (e?.response?.data?.detail || "Generation failed");
      toast.error(msg, { duration: 8000 });
    } finally {
      generatingRef.current = false;
      setBusy(false); setStage("");
    }
  };

  // Auto-trigger ONCE per id when there is no cached package.
  useEffect(() => {
    if (!job) return;
    if (generatedForIdRef.current === id) return;
    if (pkg) { generatedForIdRef.current = id; return; }
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, job]);

  const copy = async (txt) => {
    const ok = await copyToClipboard(txt || "");
    if (ok) toast.success("Copied to clipboard");
    else toast.error("Copy blocked by browser — select the text manually");
  };

  const dl = async (fmt, kind) => {
    try {
      const baseName = `${(job?.company || "company").replace(/\s+/g, "_")}_${kind}`;
      const content = kind === "resume" ? pkg.customized_resume : pkg.cover_letter;
      if (!content) {
        toast.error("Nothing to download yet");
        return;
      }
      await downloadDoc(fmt, content, baseName);
      toast.success(`Saved ${baseName}.${fmt} to your Downloads folder (Ctrl+J / Cmd+Shift+J to open)`, { duration: 7000 });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Download failed");
    }
  };

  const markApplied = async () => {
    try {
      await createApplication({
        job: { id: job.id, title: job.title, company: job.company, location: job.location, url: job.url, description: job.description },
        score: { match_score: job.match_score, tier: job.tier, breakdown: job.breakdown },
        customized_resume: pkg?.customized_resume,
        cover_letter: pkg?.cover_letter,
        quick_answers: pkg?.quick_answers,
        status: "applied",
      });
      setSaved(true);
      toast.success("Saved to tracker");
    } catch (e) {
      toast.error("Could not save");
    }
  };

  if (!job) {
    return (
      <div className="brut-card p-8" data-testid="empty-package">
        <h2 className="font-display text-2xl font-bold uppercase">No job selected</h2>
        <button className="mt-4 brut-btn-primary" onClick={() => nav("/ranked")} data-testid="back-to-ranked">
          Back to ranked jobs
        </button>
      </div>
    );
  }

  const qa = pkg?.quick_answers || {};

  return (
    <div className="space-y-6" data-testid="package-page">
      <div>
        <div className="mono-label">Step 05 / Application Package</div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tighter">
          {job.title}
        </h1>
        <div className="mt-1 font-mono text-sm uppercase tracking-wider">
          {job.company} · {job.location || "—"} · Match {job.match_score}%
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="brut-btn" onClick={generate} disabled={busy} data-testid="regenerate-btn">
          Regenerate
        </button>
        <button className="brut-btn-primary" onClick={markApplied} disabled={!pkg || saved} data-testid="mark-applied-btn">
          {saved ? <><Check size={14} className="inline mr-1" /> Saved</> : "Mark as Applied →"}
        </button>
        <button className="brut-btn" onClick={() => nav("/tracker")} data-testid="open-tracker-btn">
          Open Tracker
        </button>
      </div>

      {busy && <Loading label={stage} />}

      {pkg && (
        <>
          <div className="flex border-b-2 border-black" data-testid="package-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                data-testid={`tab-${t.key}`}
                className={`border-r-2 border-black px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                  tab === t.key ? "bg-black text-white" : "bg-white hover:bg-zinc-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "resume" && (
            <div className="brut-card p-6" data-testid="tab-resume-content">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="mono-label">ATS-Optimized Resume</div>
                <div className="flex gap-2">
                  <button className="brut-btn" onClick={() => copy(pkg.customized_resume)}><Copy size={14} className="inline" /> Copy</button>
                  <button className="brut-btn" onClick={() => dl("txt", "resume")}><Download size={14} className="inline" /> .txt</button>
                  <button className="brut-btn" onClick={() => dl("pdf", "resume")}><Download size={14} className="inline" /> .pdf</button>
                  <button className="brut-btn" onClick={() => dl("docx", "resume")}><Download size={14} className="inline" /> .docx</button>
                </div>
              </div>
              <pre className="max-h-[60vh] overflow-auto border-2 border-black bg-zinc-50 p-4 font-mono text-xs whitespace-pre-wrap">{pkg.customized_resume}</pre>
              {!!pkg.change_summary?.length && (
                <div className="mt-4 border-l-4 border-[#002FA7] pl-3">
                  <div className="mono-label mb-1">What changed</div>
                  <ul className="text-sm">
                    {pkg.change_summary.map((c) => <li key={c}>• {c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === "cover" && (
            <div className="brut-card p-6" data-testid="tab-cover-content">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="mono-label">Cover Letter — tone: {pkg.tone_used} · {pkg.word_count} words</div>
                <div className="flex gap-2">
                  <button className="brut-btn" onClick={() => copy(pkg.cover_letter)}><Copy size={14} className="inline" /> Copy</button>
                  <button className="brut-btn" onClick={() => dl("txt", "cover")}><Download size={14} className="inline" /> .txt</button>
                  <button className="brut-btn" onClick={() => dl("pdf", "cover")}><Download size={14} className="inline" /> .pdf</button>
                  <button className="brut-btn" onClick={() => dl("docx", "cover")}><Download size={14} className="inline" /> .docx</button>
                </div>
              </div>
              <pre className="max-h-[60vh] overflow-auto border-2 border-black bg-zinc-50 p-4 font-mono text-sm whitespace-pre-wrap">{pkg.cover_letter}</pre>
            </div>
          )}

          {tab === "qa" && (
            <div className="brut-card p-6 space-y-4" data-testid="tab-qa-content">
              {[
                ["Tell us about yourself", qa.tell_us_about_yourself],
                ["Why should we hire you", qa.why_should_we_hire_you],
                ["Summarize your experience", qa.summarize_your_experience || qa.summarize_qa_experience],
                ["Notice period", qa.notice_period],
              ].map(([label, val]) => (
                <div key={label} className="border-2 border-black bg-zinc-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="mono-label">{label}</div>
                    <button className="brut-btn" onClick={() => copy(val)}><Copy size={12} className="inline" /> Copy</button>
                  </div>
                  <p className="mt-2 font-mono text-sm whitespace-pre-wrap">{val}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
