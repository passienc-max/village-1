import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Phone, Users, Car, MessageSquareLock, BadgeCheck, Siren } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiError } from "@/lib/api";
import { REPORT_REASONS } from "@/components/ReportDialog";

const GUIDES = [
  { icon: Users, title: "Meet in public first", body: "For first-time handoffs, meet at a school, library or busy store parking lot." },
  { icon: MessageSquareLock, title: "Keep chats on Parent Link", body: "Share exact addresses only in the private request chat, and only once you're comfortable." },
  { icon: Car, title: "Transporting kids", body: "Use proper car seats and boosters required by Oregon law. Parents provide seats if the volunteer doesn't have one." },
  { icon: BadgeCheck, title: "Check profiles", body: "Read a neighbor's profile and completed-help count before accepting or handing off." },
  { icon: Phone, title: "Tell someone", body: "Let a friend or family member know who you're meeting, where, and when." },
  { icon: Siren, title: "Trust your gut", body: "If something feels off, cancel, step back, and report it. You never owe anyone an explanation." },
];

const IncidentForm = () => {
  const { user } = useAuth();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");

  if (!user) return <p className="text-sm text-stone-600"><Link to="/login" className="font-semibold text-[#D96838] hover:underline" data-testid="safety-login-link">Log in</Link> to submit a private report.</p>;

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/reports", { target_type: "general", reason, details });
      toast.success("Report sent privately to the Village safety team.");
      setDetails("");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Select value={reason} onValueChange={setReason}>
        <SelectTrigger className="h-11 bg-white" data-testid="incident-reason-select"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-white">{REPORT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
      </Select>
      <Textarea required rows={5} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Describe what happened, who was involved and when." data-testid="incident-details-input" className="bg-white" />
      <button type="submit" data-testid="incident-submit-btn" className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800">Submit report</button>
    </form>
  );
};

export default function SafetyHub() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6" data-testid="safety-page">
      <h1 className="font-heading text-4xl font-bold text-stone-900 sm:text-5xl">Safety in the Village</h1>
      <p className="mt-3 max-w-2xl text-stone-600">Parent Link is a neighbor-to-neighbor network, not a licensed childcare or medical service. These guidelines help everyone stay safe.</p>
      <div className="mt-8 grid gap-4 rounded-2xl border border-red-200 bg-red-50 p-6 sm:grid-cols-3" data-testid="emergency-contacts">
        <div><p className="text-3xl font-bold text-red-800">911</p><p className="text-sm text-red-900">Emergencies and immediate danger</p></div>
        <div><p className="text-3xl font-bold text-red-800">988</p><p className="text-sm text-red-900">Suicide & crisis lifeline, call or text</p></div>
        <div><p className="text-3xl font-bold text-red-800">211</p><p className="text-sm text-red-900">Local help with food, housing and services</p></div>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-[#E5E3D8] bg-white p-6">
            <Icon className="h-6 w-6 text-[#588157]" />
            <p className="mt-4 font-heading text-lg font-semibold text-stone-900">{title}</p>
            <p className="mt-1 text-sm text-stone-600">{body}</p>
          </div>
        ))}
      </div>
      <section className="mt-12 grid gap-8 rounded-2xl bg-[#F4F3EE] p-6 sm:p-10 lg:grid-cols-2">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-stone-900">Report an incident</h2>
          <p className="mt-2 text-stone-600">Reports go privately to Village admins, who review every one. You can also report a specific user or request from its page.</p>
        </div>
        <IncidentForm />
      </section>
    </div>
  );
}
