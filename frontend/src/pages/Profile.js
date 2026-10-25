import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { BadgeCheck, Car, ExternalLink } from "lucide-react";
import { MyReferences } from "@/components/MyReferences";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RolePicker } from "@/components/RolePicker";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiError } from "@/lib/api";
import { NEIGHBORHOODS, ROLE_LABELS, CATEGORIES, canVolunteer } from "@/lib/constants";

const DRIVER_LABEL = { none: "Not verified", pending: "Under review", approved: "Verified driver", rejected: "Needs resubmission" };

const DriverCard = ({ status }) => (
  <Link to="/driver-verification" data-testid="profile-driver-link" className="flex items-center gap-4 rounded-xl border border-[#E5E3D8] bg-white p-5 transition-colors hover:bg-[#F4F3EE]">
    {status === "approved" ? <BadgeCheck className="h-7 w-7 text-[#1E3D2F]" /> : <Car className="h-7 w-7 text-[#D96838]" />}
    <div className="flex-1">
      <p className="font-heading font-semibold text-stone-900">Driver verification: {DRIVER_LABEL[status || "none"]}</p>
      <p className="text-sm text-stone-600">Upload your license, insurance and a selfie to offer rides.</p>
    </div>
  </Link>
);

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name, bio: user.bio || "", neighborhood: user.neighborhood || "Klamath Falls",
    role: user.role, email_notifications: user.email_notifications !== false,
    availability: user.availability || "", help_categories: user.help_categories || [],
  });
  const toggleCat = (c) => setForm((f) => ({ ...f, help_categories: f.help_categories.includes(c) ? f.help_categories.filter((x) => x !== c) : [...f.help_categories, c] }));
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));

  const save = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put("/profile", form);
      setUser(data);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6" data-testid="profile-page">
      <h1 className="font-heading text-4xl font-bold text-stone-900">My profile</h1>
      <p className="mt-2 text-stone-600">{user.email} · {ROLE_LABELS[user.role]}</p>
      <Link to={`/users/${user.user_id}`} data-testid="view-public-profile-link" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#D96838] hover:underline">View my public profile <ExternalLink className="h-3.5 w-3.5" /></Link>
      {canVolunteer(user) && <div className="mt-6"><DriverCard status={user.driver_status} /></div>}
      <form onSubmit={save} className="mt-8 space-y-6 rounded-xl border border-[#E5E3D8] bg-white p-6 sm:p-8">
        <div className="space-y-1.5"><Label>Name</Label><Input required value={form.name} onChange={set("name")} data-testid="profile-name-input" className="h-11" /></div>
        <div className="space-y-1.5">
          <Label>About you</Label>
          <Textarea rows={4} value={form.bio} onChange={set("bio")} data-testid="profile-bio-input" placeholder="A few words for neighbors: your kids' ages, your car, when you're free to help..." />
        </div>
        <div className="space-y-1.5"><Label>Availability</Label><Input value={form.availability} onChange={set("availability")} data-testid="profile-availability-input" placeholder="e.g. Weekday afternoons, Saturday mornings" className="h-11" /></div>
        <div className="space-y-1.5">
          <Label>I can help with / I usually need</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button type="button" key={c.value} onClick={() => toggleCat(c.value)} data-testid={`profile-help-${c.value}`}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${form.help_categories.includes(c.value) ? "border-[#1E3D2F] bg-[#1E3D2F] text-white" : "border-[#E5E3D8] bg-white text-stone-700"}`}>{c.label}</button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Community</Label>
          <Select value={form.neighborhood} onValueChange={set("neighborhood")}>
            <SelectTrigger className="h-11 bg-white" data-testid="profile-neighborhood-select"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white">{NEIGHBORHOODS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {user.role !== "admin" && <div className="space-y-1.5"><Label>My role</Label><RolePicker value={form.role} onChange={set("role")} /></div>}
        <div className="flex items-center justify-between rounded-lg bg-[#F4F3EE] p-4">
          <div>
            <p className="text-sm font-semibold text-stone-900">Email notifications</p>
            <p className="text-xs text-stone-600">Get an email when a request is accepted or you get a new message.</p>
          </div>
          <Switch checked={form.email_notifications} onCheckedChange={set("email_notifications")} data-testid="profile-email-toggle" />
        </div>
        <button type="submit" data-testid="profile-save-btn" className="rounded-lg bg-[#1E3D2F] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#162E23]">Save changes</button>
      </form>
      <div className="mt-8"><MyReferences /></div>
    </div>
  );
}
