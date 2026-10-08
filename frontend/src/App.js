import "@/App.css";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthCallback } from "@/components/AuthCallback";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import VolunteerBoard from "@/pages/VolunteerBoard";
import RequestDetail from "@/pages/RequestDetail";
import Profile from "@/pages/Profile";
import UserProfile from "@/pages/UserProfile";
import SafetyHub from "@/pages/SafetyHub";
import AdminPanel from "@/pages/AdminPanel";
import { LocalResources, BusinessDirectory } from "@/pages/Directories";

const Layout = () => (
  <div className="flex min-h-screen flex-col bg-[#FAFAF7]">
    <Navbar />
    <main className="flex-1"><Outlet /></main>
    <Footer />
  </div>
);

const guard = (el, adminOnly) => <ProtectedRoute adminOnly={adminOnly}>{el}</ProtectedRoute>;

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/resources" element={<LocalResources />} />
        <Route path="/businesses" element={<BusinessDirectory />} />
        <Route path="/safety" element={<SafetyHub />} />
        <Route path="/onboarding" element={guard(<Onboarding />)} />
        <Route path="/dashboard" element={guard(<Dashboard />)} />
        <Route path="/board" element={guard(<VolunteerBoard />)} />
        <Route path="/requests/:id" element={guard(<RequestDetail />)} />
        <Route path="/profile" element={guard(<Profile />)} />
        <Route path="/users/:id" element={guard(<UserProfile />)} />
        <Route path="/admin" element={guard(<AdminPanel />, true)} />
        <Route path="*" element={<LandingPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
