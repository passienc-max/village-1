import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { IMAGES, NEIGHBORHOODS } from "@/lib/constants";
import { RolePicker } from "@/components/RolePicker";

const googleLogin = () => {
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const redirectUrl = window.location.origin + "/dashboard";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
};

const GoogleButton = () => (
  <button type="button" onClick={googleLogin} data-testid="google-login-btn"
    className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#E5E3D8] bg-white py-3 text-sm font-semibold text-stone-800 transition-colors hover:bg-[#F4F3EE]">
    <svg className="h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
    Continue with Google
  </button>
);

const Divider = () => (
  <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-stone-400">
    <span className="h-px flex-1 bg-[#E5E3D8]" />or<span className="h-px flex-1 bg-[#E5E3D8]" />
  </div>
);

export default function AuthPage({ mode }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: params.get("role") || "parent", neighborhood: "Klamath Falls" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  useEffect(() => setError(""), [mode]);
  if (user) return <Navigate to={location.state?.from || "/dashboard"} replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isRegister) await register(form);
      else await login(form.email, form.password);
      navigate(location.state?.from || "/dashboard");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden rounded-2xl lg:block">
        <img src={IMAGES.volunteer} alt="Volunteers helping outdoors" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E3D2F]/90 to-transparent" />
        <p className="absolute bottom-10 left-10 right-10 font-heading text-3xl font-semibold text-white">
          "Nobody should have to choose between work and getting their kid to practice."
        </p>
      </div>
      <div className="flex items-center justify-center">
        <div className="w-full max-w-md animate-rise" data-testid={`${mode}-form-container`}>
          <h1 className="font-heading text-4xl font-bold text-stone-900">{isRegister ? "Join the Village" : "Welcome back"}</h1>
          <p className="mt-2 text-stone-600">{isRegister ? "Create your account to ask for help or lend a hand." : "Log in to see your requests and messages."}</p>
          <div className="mt-8"><GoogleButton /></div>
          <Divider />
          <form onSubmit={submit} className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5"><Label>Your name</Label><Input required value={form.name} onChange={set("name")} data-testid="register-name-input" className="h-11 bg-white" /></div>
            )}
            <div className="space-y-1.5"><Label>Email</Label><Input required type="email" value={form.email} onChange={set("email")} data-testid={`${mode}-email-input`} className="h-11 bg-white" /></div>
            <div className="space-y-1.5"><Label>Password</Label><Input required type="password" minLength={isRegister ? 8 : 1} value={form.password} onChange={set("password")} data-testid={`${mode}-password-input`} className="h-11 bg-white" placeholder={isRegister ? "At least 8 characters" : ""} /></div>
            {isRegister && (
              <>
                <div className="space-y-1.5"><Label>I want to...</Label><RolePicker value={form.role} onChange={set("role")} /></div>
                <div className="space-y-1.5">
                  <Label>Your community</Label>
                  <Select value={form.neighborhood} onValueChange={set("neighborhood")}>
                    <SelectTrigger className="h-11 bg-white" data-testid="register-neighborhood-select"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">{NEIGHBORHOODS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="auth-error">{error}</p>}
            <button type="submit" disabled={busy} data-testid={`${mode}-submit-btn`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1E3D2F] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#162E23] disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}{isRegister ? "Create account" : "Log in"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-stone-600">
            {isRegister ? "Already have an account? " : "New to the Village? "}
            <Link to={isRegister ? "/login" : "/register"} className="font-semibold text-[#D96838] hover:underline" data-testid="auth-switch-link">
              {isRegister ? "Log in" : "Create an account"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
