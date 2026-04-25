import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API, timeout: 180000 });

// Surface budget-exceeded errors with a clear, actionable message.
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 402) {
      err.userMessage =
        err.response.data?.detail ||
        "Universal Key out of balance — top up at Profile → Universal Key → Add Balance.";
      err.budgetExceeded = true;
    }
    return Promise.reject(err);
  }
);

export const parseResumeFile = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await http.post("/resume/parse-file", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.resume_text;
};

export const extractProfile = async (resume_text, role_hint) =>
  (await http.post("/agents/extract-profile", { resume_text, role_hint })).data.profile;

export const generateJobSearches = async (profile) =>
  (await http.post("/agents/job-search", { profile })).data.searches;

export const scoreJobs = async (profile, jobs) =>
  (await http.post("/agents/score-jobs", { profile, jobs })).data.result;

export const customizeResume = async (resume_text, profile, job) =>
  (await http.post("/agents/customize-resume", { resume_text, profile, job })).data.result;

export const writeCoverLetter = async (profile, job, customized_resume) =>
  (await http.post("/agents/cover-letter", { profile, job, customized_resume })).data.result;

export const createApplication = async (payload) =>
  (await http.post("/applications", payload)).data;

export const listApplications = async () =>
  (await http.get("/applications")).data.items;

export const updateStatus = async (id, status) =>
  (await http.patch(`/applications/${id}/status`, { status })).data;

export const deleteApplication = async (id) =>
  (await http.delete(`/applications/${id}`)).data;

export const downloadDoc = async (fmt, content, filename) => {
  const res = await http.post(
    `/download/${fmt}`,
    { content, filename },
    { responseType: "blob" }
  );
  const blob = new Blob([res.data]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${fmt}`;
  // target=_blank helps when the page is embedded in an iframe (preview).
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 4000);
};
