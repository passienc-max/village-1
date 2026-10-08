import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RolePicker } from "@/components/RolePicker";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiError } from "@/lib/api";
import { NEIGHBORHOODS } from "@/lib/constants";

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(user?.role || "parent");
  const [hood, setHood] = useState(user?.neighborhood || "Klamath Falls");

  const save = async () => {
    try {
      const { data } = await api.put("/profile", { role, neighborhood: hood });
      setUser(data);
      navigate("/dashboard");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16" data-testid="onboarding-page">
      <h1 className="font-heading text-4xl font-bold text-stone-900">Welcome, {user?.name?.split(" ")[0]}</h1>
      <p className="mt-2 text-stone-600">Tell us how you'd like to be part of the Village. You can change this anytime.</p>
      <div className="mt-8 space-y-6">
        <RolePicker value={role} onChange={setRole} />
        <Select value={hood} onValueChange={setHood}>
          <SelectTrigger className="h-11 bg-white" data-testid="onboarding-neighborhood-select"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white">{NEIGHBORHOODS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
        </Select>
        <button onClick={save} data-testid="onboarding-submit-btn" className="w-full rounded-lg bg-[#1E3D2F] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#162E23]">
          Continue
        </button>
      </div>
    </div>
  );
}
