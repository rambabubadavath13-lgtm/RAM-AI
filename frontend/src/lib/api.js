import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API, timeout: 180000 });

export const parseResumeFile = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await http.post("/resume/parse-file", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.resume_text;
};

export const extractProfile = async (resume_text) =>
  (await http.post("/agents/extract-profile", { resume_text })).data.profile;

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
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
