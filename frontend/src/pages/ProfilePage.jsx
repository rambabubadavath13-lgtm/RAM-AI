import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis,
} from "recharts";
import { loadState } from "../lib/store";

const Field = ({ label, value }) => (
  <div className="border-2 border-black bg-zinc-50 p-3">
    <div className="mono-label">{label}</div>
    <div className="mt-1 font-display text-lg font-bold">{value || "—"}</div>
  </div>
);

const Chip = ({ children, testId }) => (
  <span
    className="inline-flex items-center border-2 border-black bg-white px-2 py-1 text-xs font-mono font-semibold uppercase tracking-wider"
    data-testid={testId}
  >
    {children}
  </span>
);

export default function ProfilePage() {
  const nav = useNavigate();
  const { profile } = loadState();

  const radarData = useMemo(() => {
    if (!profile) return [];
    const h = profile.skills?.hard || {};
    const count = (k) => (Array.isArray(h[k]) ? h[k].length : 0);
    return [
      { dim: "Automation", v: Math.min(100, count("automation_frameworks") * 25) },
      { dim: "API", v: Math.min(100, count("api_tools") * 33) },
      { dim: "Languages", v: Math.min(100, count("languages") * 25) },
      { dim: "Databases", v: Math.min(100, count("databases") * 33) },
      { dim: "CI/CD", v: Math.min(100, count("ci_cd") * 33) },
      { dim: "Methods", v: Math.min(100, count("methodologies") * 25) },
    ];
  }, [profile]);

  if (!profile) {
    return (
      <div className="brut-card p-8" data-testid="empty-profile">
        <h2 className="font-display text-2xl font-bold uppercase">No profile yet</h2>
        <p className="mt-2 text-zinc-700">Upload a resume first.</p>
        <button className="mt-4 brut-btn-primary" onClick={() => nav("/")} data-testid="go-upload">
          Go to upload
        </button>
      </div>
    );
  }

  const c = profile.candidate || {};
  const sp = profile.search_params || {};
  const ps = profile.profile_score || {};
  const hard = profile.skills?.hard || {};

  return (
    <div className="space-y-8" data-testid="profile-page">
      <div>
        <div className="mono-label">Step 02 / Candidate Profile</div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold uppercase tracking-tighter">
          {c.name || "Candidate"}
        </h1>
        <p className="mt-2 text-zinc-700">{ps.summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Field label="Experience" value={`${c.total_years_experience ?? "—"} yrs`} />
        <Field label="Level" value={c.experience_level} />
        <Field label="Title" value={c.current_title} />
        <Field label="Location" value={c.current_location} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="brut-card p-6 lg:col-span-2">
          <div className="mono-label mb-3">Skills Inventory</div>
          <div className="space-y-3">
            {[
              ["Testing Types", hard.testing_types],
              ["Automation Frameworks", hard.automation_frameworks],
              ["API Tools", hard.api_tools],
              ["Languages", hard.languages],
              ["Databases", hard.databases],
              ["CI / CD", hard.ci_cd],
              ["Bug Tracking", hard.bug_tracking],
              ["Methodologies", hard.methodologies],
            ].map(([label, list]) => (
              <div key={label}>
                <div className="mono-label">{label}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(list || []).length === 0 && (
                    <span className="text-xs text-zinc-500">— none detected</span>
                  )}
                  {(list || []).map((x, i) => (
                    <Chip key={i} testId={`skill-${label}-${i}`}>{x}</Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="brut-card p-6">
          <div className="mono-label mb-3">Skills Radar</div>
          <div className="h-72 border-2 border-black bg-zinc-50 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#000" />
                <PolarAngleAxis dataKey="dim" tick={{ fill: "#000", fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} stroke="#000" />
                <Radar dataKey="v" stroke="#002FA7" fill="#002FA7" fillOpacity={0.35} isAnimationActive={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="border-2 border-black bg-yellow-200 p-3 text-center">
              <div className="mono-label">Uniqueness</div>
              <div className="font-display text-5xl font-black">{ps.uniqueness_score ?? "–"}</div>
            </div>
            <div className="border-2 border-black bg-zinc-50 p-3">
              <div className="mono-label">Salary band</div>
              <div className="font-display text-base font-bold mt-1">{sp.salary_estimate || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="brut-card p-6">
          <div className="mono-label mb-2">Top Strengths</div>
          <ul className="space-y-1">
            {(ps.strengths || []).map((s, i) => (
              <li key={i} className="font-mono text-sm">+ {s}</li>
            ))}
          </ul>
        </div>
        <div className="brut-card p-6">
          <div className="mono-label mb-2">Top Gaps</div>
          <ul className="space-y-1">
            {(ps.gaps || []).map((s, i) => (
              <li key={i} className="font-mono text-sm">- {s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="brut-btn-primary" onClick={() => nav("/hunt")} data-testid="confirm-start-search-btn">
          Confirm & Start Job Search →
        </button>
        <button className="brut-btn" onClick={() => nav("/")} data-testid="back-upload-btn">
          ← Edit resume
        </button>
      </div>
    </div>
  );
}
