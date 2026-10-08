import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (user === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" data-testid="auth-loading">
        <Loader2 className="h-6 w-6 animate-spin text-[#1E3D2F]" />
      </div>
    );
  }
  if (user === false) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!user.role && location.pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
};
