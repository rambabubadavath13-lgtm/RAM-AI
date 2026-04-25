import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";

import Layout from "@/components/Layout";
import UploadPage from "@/pages/UploadPage";
import ProfilePage from "@/pages/ProfilePage";
import JobHuntPage from "@/pages/JobHuntPage";
import RankedJobsPage from "@/pages/RankedJobsPage";
import PackagePage from "@/pages/PackagePage";
import TrackerPage from "@/pages/TrackerPage";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <Layout>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/hunt" element={<JobHuntPage />} />
          <Route path="/ranked" element={<RankedJobsPage />} />
          <Route path="/package" element={<PackagePage />} />
          <Route path="/tracker" element={<TrackerPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
