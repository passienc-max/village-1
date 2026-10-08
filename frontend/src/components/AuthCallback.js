import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export const AuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const match = location.hash.match(/session_id=([^&]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;
    window.history.replaceState(null, "", window.location.pathname);
    if (!sessionId) { navigate("/login", { replace: true }); return; }
    api.post("/auth/google/session", { session_id: sessionId })
      .then(({ data }) => {
        setUser(data);
        navigate(data.role ? "/dashboard" : "/onboarding", { replace: true, state: { user: data } });
      })
      .catch((e) => {
        toast.error(formatApiError(e));
        setUser(false);
        navigate("/login", { replace: true });
      });
  }, [location.hash, navigate, setUser]);

  return <div className="min-h-screen bg-[#FAFAF7]" data-testid="auth-callback" />;
};
