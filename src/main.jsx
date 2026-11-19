import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppLayout from "./components/layout/AppLayout";
import CompareSkeleton from "./components/compare/CompareSkeleton";
import ProtectedRoute from "./routes/ProtectedRoute";
import "./styles.css";

const Landing = lazy(() => import("./pages/Landing"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analyzer = lazy(() => import("./pages/Analyzer"));
const Workspace = lazy(() => import("./pages/Workspace"));
const History = lazy(() => import("./pages/History"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

function App() {
  return <BrowserRouter><Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-muted">Loading RepoSense…</div>}><Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/analyze" element={<Analyzer />} />
      <Route path="/analysis/:id/*" element={<Workspace />} />
      <Route path="/history" element={<History />} />
      <Route path="/compare" element={<Suspense fallback={<CompareSkeleton/>}><ComparePage/></Suspense>} />
      <Route path="/profile" element={<Profile />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes></Suspense><Toaster position="bottom-right" toastOptions={{ duration: 3000, style: { background: "var(--panel)", color: "var(--text)", border: "1px solid var(--border)" } }} /></BrowserRouter>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><ThemeProvider><AuthProvider><App /></AuthProvider></ThemeProvider></React.StrictMode>);
