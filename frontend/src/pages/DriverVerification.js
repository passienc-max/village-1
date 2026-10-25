import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, IdCard, FileCheck2, Camera, BadgeCheck, Hourglass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { canVolunteer } from "@/lib/constants";

const FIELDS = [
  { key: "license", label: "Driver's license (front)", icon: IdCard },
  { key: "insurance", label: "Vehicle insurance card", icon: FileCheck2 },
  { key: "selfie", label: "Selfie holding your license", icon: Camera, capture: "user" },
];

const FilePick = ({ field, file, onPick }) => {
  const Icon = field.icon;
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E5E3D8] bg-[#FAFAF7] p-4 text-center transition-colors hover:border-[#588157]" data-testid={`driver-${field.key}-dropzone`}>
      {file ? <img src={URL.createObjectURL(file)} alt="" className="h-28 w-full rounded-lg object-cover" /> : <Icon className="h-8 w-8 text-[#588157]" />}
      <span className="text-sm font-semibold text-stone-800">{field.label}</span>
      <span className="text-xs text-stone-500">{file ? file.name : "Tap to upload a photo"}</span>
      <input type="file" accept="image/*" capture={field.capture} className="hidden" data-testid={`driver-${field.key}-input`} onChange={(e) => onPick(e.target.files?.[0])} />
    </label>
  );
};

const StatusCard = ({ status, note }) => {
  const map = {
    pending: { icon: Hourglass, title: "Under review", body: "A Village admin is reviewing your documents. You'll get a notification and email when it's done.", cls: "bg-amber-50 border-amber-200" },
    approved: { icon: BadgeCheck, title: "You're a verified driver", body: "You can now accept ride requests on the volunteer board.", cls: "bg-[#EBF2EC] border-[#588157]/40" },
    rejected: { icon: IdCard, title: "Please resubmit", body: note || "Something didn't check out. Please upload clear, current photos.", cls: "bg-red-50 border-red-200" },
  }[status];
  if (!map) return null;
  const Icon = map.icon;
  return (
    <div className={`flex gap-4 rounded-xl border p-5 ${map.cls}`} data-testid={`driver-status-${status}`}>
      <Icon className="h-6 w-6 shrink-0 text-[#1E3D2F]" />
      <div><p className="font-heading font-semibold text-stone-900">{map.title}</p><p className="text-sm text-stone-700">{map.body}</p></div>
    </div>
  );
};

export default function DriverVerification() {
  const { user, checkAuth } = useAuth();
  const [info, setInfo] = useState(null);
  const [files, setFiles] = useState({});
  const [vehicle, setVehicle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/driver/verification/me").then((r) => setInfo(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (FIELDS.some((f) => !files[f.key])) { toast.error("Please add all three photos"); return; }
    const fd = new FormData();
    FIELDS.forEach((f) => fd.append(f.key, files[f.key]));
    fd.append("vehicle", vehicle);
    setBusy(true);
    try {
      await api.post("/driver/verification", fd);
      toast.success("Submitted! We'll review your documents soon.");
      await Promise.all([load(), checkAuth()]);
    } catch (err) { toast.error(formatApiError(err)); } finally { setBusy(false); }
  };

  if (!info) return null;
  const status = info.driver_status;
  const canSubmit = canVolunteer(user) && ["none", "rejected"].includes(status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6" data-testid="driver-verification-page">
      <h1 className="font-heading text-4xl font-bold text-stone-900">Driver verification</h1>
      <p className="mt-2 text-stone-600">To keep kids and families safe, volunteers must be verified before offering or giving rides. Your documents are private and only seen by Village admins.</p>
      <div className="mt-6"><StatusCard status={status} note={info.verification?.admin_note} /></div>
      {!canVolunteer(user) && <p className="mt-6 rounded-lg bg-[#F4F3EE] p-4 text-sm text-stone-700">Switch your role to volunteer in <Link to="/profile" className="font-semibold text-[#D96838] underline">your profile</Link> to offer rides.</p>}
      {canSubmit && (
        <form onSubmit={submit} className="mt-6 space-y-5 rounded-xl border border-[#E5E3D8] bg-white p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {FIELDS.map((f) => <FilePick key={f.key} field={f} file={files[f.key]} onPick={(file) => setFiles((p) => ({ ...p, [f.key]: file }))} />)}
          </div>
          <div className="space-y-1.5"><Label>Vehicle (optional)</Label><Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="e.g. 2018 Subaru Outback, gray, seats 5" data-testid="driver-vehicle-input" /></div>
          <button type="submit" disabled={busy} data-testid="driver-submit-btn" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1E3D2F] py-3 text-sm font-semibold text-white hover:bg-[#162E23] disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit for review
          </button>
        </form>
      )}
    </div>
  );
}
