// Lightweight client-side workflow state via localStorage.
const KEY = "ajas_state_v1";

const defaultState = {
  resumeText: "",
  profile: null,
  searches: null,
  pastedJobs: [], // [{id,title,company,location,description,url}]
  scoreResult: null, // {ranked_jobs, top_5_recommendations, skill_gap_pattern}
  packages: {}, // jobId -> {customized_resume, change_summary, cover_letter, quick_answers, tone_used}
};

export const loadState = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultState };
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return { ...defaultState };
  }
};

export const saveState = (state) => {
  localStorage.setItem(KEY, JSON.stringify(state));
};

export const updateState = (patch) => {
  const cur = loadState();
  const next = { ...cur, ...patch };
  saveState(next);
  return next;
};

export const resetState = () => {
  localStorage.removeItem(KEY);
};
