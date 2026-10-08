import { useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, formatApiError } from "@/lib/api";
import { CATEGORIES, NEIGHBORHOODS } from "@/lib/constants";

const empty = (hood) => ({ category: "ride", title: "", description: "", neighborhood: hood || "Klamath Falls",
  location_note: "", needed_date: "", needed_time: "", urgency: "normal" });

const Field = ({ label, children }) => (
  <div className="space-y-1.5"><Label className="text-sm font-semibold text-stone-800">{label}</Label>{children}</div>
);

const PickSelect = ({ value, onChange, options, testId }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger data-testid={testId} className="bg-white"><SelectValue /></SelectTrigger>
    <SelectContent className="bg-white">
      {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
    </SelectContent>
  </Select>
);

export const CreateRequestDialog = ({ user, onCreated }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty(user?.neighborhood));
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/requests", form);
      toast.success("Request posted. Volunteers nearby can now see it.");
      setForm(empty(user?.neighborhood));
      setOpen(false);
      onCreated?.();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button data-testid="create-request-btn" className="inline-flex items-center gap-2 rounded-lg bg-[#D96838] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#BE5527]">
          <Plus className="h-4 w-4" /> Ask for help
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-lg" data-testid="create-request-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">What do you need help with?</DialogTitle>
          <DialogDescription>Only share a general area. Exact addresses go in the private chat once a volunteer accepts.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type of help"><PickSelect testId="request-category-select" value={form.category} onChange={set("category")} options={CATEGORIES} /></Field>
            <Field label="Urgency"><PickSelect testId="request-urgency-select" value={form.urgency} onChange={set("urgency")} options={[{ value: "normal", label: "Normal" }, { value: "urgent", label: "Urgent" }]} /></Field>
          </div>
          <Field label="Short title"><Input required minLength={3} data-testid="request-title-input" value={form.title} onChange={set("title")} placeholder="Ride to Ponderosa Middle School on Tuesday" /></Field>
          <Field label="Details"><Textarea required minLength={3} rows={4} data-testid="request-description-input" value={form.description} onChange={set("description")} placeholder="Number of kids, car seats needed, what to pick up..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Community"><PickSelect testId="request-neighborhood-select" value={form.neighborhood} onChange={set("neighborhood")} options={NEIGHBORHOODS.map((n) => ({ value: n, label: n }))} /></Field>
            <Field label="General area (optional)"><Input data-testid="request-location-input" value={form.location_note} onChange={set("location_note")} placeholder="Near Moore Park" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date needed"><Input required type="date" data-testid="request-date-input" value={form.needed_date} onChange={set("needed_date")} /></Field>
            <Field label="Time (optional)"><Input type="time" data-testid="request-time-input" value={form.needed_time} onChange={set("needed_time")} /></Field>
          </div>
          <button type="submit" disabled={busy} data-testid="create-request-submit-btn"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1E3D2F] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#162E23] disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Post request
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
