import { useState } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, formatApiError } from "@/lib/api";

export const REPORT_REASONS = ["Unsafe behavior", "Harassment or inappropriate messages", "No-show or unreliable",
  "Scam or suspicious request", "Concern about a child's safety", "Other"];

export const ReportDialog = ({ targetType, targetId, label = "Report", testId = "report-user-btn" }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");

  const submit = async () => {
    try {
      await api.post("/reports", { target_type: targetType, target_id: targetId, reason, details });
      toast.success("Report sent privately to the Village safety team.");
      setOpen(false);
      setDetails("");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button data-testid={testId} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50">
          <Flag className="h-4 w-4" /> {label}
        </button>
      </DialogTrigger>
      <DialogContent className="bg-white" data-testid="report-modal">
        <DialogHeader>
          <DialogTitle className="font-heading">Report a safety concern</DialogTitle>
          <DialogDescription>Reports are private. If anyone is in immediate danger, call 911 first.</DialogDescription>
        </DialogHeader>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger data-testid="report-reason-select" className="bg-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white">{REPORT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
        <Textarea rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What happened?" data-testid="report-details-input" />
        <button onClick={submit} data-testid="report-submit-btn" className="rounded-lg bg-red-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800">
          Submit report
        </button>
      </DialogContent>
    </Dialog>
  );
};
