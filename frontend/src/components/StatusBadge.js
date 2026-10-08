import { STATUS } from "@/lib/constants";

export const StatusBadge = ({ status, testId }) => {
  const s = STATUS[status] || STATUS.open;
  return (
    <span data-testid={testId} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
};

export const UrgentBadge = () => (
  <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800">
    Urgent
  </span>
);
