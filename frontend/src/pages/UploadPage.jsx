import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Upload, FileText } from "lucide-react";
import Loading from "../components/Loading";
import { parseResumeFile, extractProfile } from "../lib/api";
import { loadState, updateState } from "../lib/store";

export default function UploadPage() {
  const nav = useNavigate();
  const [text, setText] = useState(loadState().resumeText || "");
  const [roleHint, setRoleHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const fileRef = useRef(null);

  const onFile = async (file) => {
    if (!file) return;
    try {
      setBusy(true);
      setStage("Parsing resume file...");
      const t = await parseResumeFile(file);
      setText(t);
      toast.success("Resume parsed");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to parse file");
    } finally {
      setBusy(false);
      setStage("");
    }
  };

  const analyze = async () => {
    if (!text.trim()) {
      toast.error("Paste or upload a resume first");
      return;
    }
    try {
      setBusy(true);
      setStage("Agent 1 — extracting profile...");
      const profile = await extractProfile(text, roleHint);
      updateState({ resumeText: text, profile, searches: null, pastedJobs: [], scoreResult: null, packages: {} });
      toast.success("Profile extracted");
      nav("/profile");
    } catch (e) {
      const msg = e?.budgetExceeded ? e.userMessage : (e?.response?.data?.detail || "Agent 1 failed");
      toast.error(msg, { duration: 8000 });
    } finally {
      setBusy(false);
      setStage("");
    }
  };

  return (
    <div className="space-y-8" data-testid="upload-page">
      <div>
        <div className="mono-label">Step 01 / Resume</div>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-tighter">
          Upload your resume.
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-700">
          Drop a PDF or DOCX, or paste plain text. The Profile Extractor agent
          will turn it into a structured candidate profile.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div
          className="brut-card p-6"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
          data-testid="upload-dropzone"
        >
          <div className="mono-label mb-3">File upload</div>
          <div className="grid place-items-center border-4 border-dashed border-black bg-zinc-50 p-10 text-center">
            <Upload size={36} strokeWidth={2.5} />
            <div className="mt-3 font-mono text-sm">Drag & drop PDF / DOCX here</div>
            <button
              className="mt-4 brut-btn"
              onClick={() => fileRef.current?.click()}
              data-testid="choose-file-btn"
            >
              Choose File
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
              data-testid="file-input"
            />
          </div>
        </div>

        <div className="brut-card p-6">
          <div className="mono-label mb-3">Or paste resume text</div>
          <textarea
            className="brut-input min-h-[260px] w-full"
            placeholder="Paste resume text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            data-testid="resume-textarea"
          />
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
            <FileText size={14} /> {text.length.toLocaleString()} chars
          </div>
        </div>
      </div>

      {busy && <Loading label={stage || "Working..."} />}

      <div className="brut-card-sm p-4">
        <div className="mono-label mb-2">Target role hint <span className="text-zinc-500">(optional)</span></div>
        <input
          className="brut-input w-full"
          placeholder="e.g. Frontend Developer, Data Scientist, Product Manager — leave empty to auto-detect from resume"
          value={roleHint}
          onChange={(e) => setRoleHint(e.target.value)}
          data-testid="role-hint-input"
        />
        <div className="mt-2 text-xs text-zinc-600">
          Works for any role — engineering, design, data, product, marketing, etc. Auto-detects from your resume content.
        </div>
      </div>

      <div className="flex gap-3">
        <button
          className="brut-btn-primary"
          onClick={analyze}
          disabled={busy}
          data-testid="analyze-profile-btn"
        >
          Analyze My Profile →
        </button>
        <button
          className="brut-btn"
          onClick={() => setText("")}
          disabled={busy}
          data-testid="clear-btn"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
