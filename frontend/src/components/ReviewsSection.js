import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, formatApiError } from "@/lib/api";
import { categoryOf, timeAgo } from "@/lib/constants";
import { Stars } from "@/components/Stars";

const ReviewForm = ({ userId, options, onDone }) => {
  const [requestId, setRequestId] = useState(options[0].request_id);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/users/${userId}/reviews`, { request_id: requestId, rating, comment });
      toast.success("Thanks for your review!");
      setComment("");
      onDone();
    } catch (err) { toast.error(formatApiError(err)); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-[#D4A373] bg-[#FDF8F0] p-5" data-testid="review-form">
      <p className="font-heading font-semibold text-stone-900">Leave a review</p>
      <Select value={requestId} onValueChange={setRequestId}>
        <SelectTrigger className="bg-white" data-testid="review-request-select"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-white">{options.map((o) => <SelectItem key={o.request_id} value={o.request_id}>{o.title}</SelectItem>)}</SelectContent>
      </Select>
      <Stars value={rating} onChange={setRating} size="h-6 w-6" testId="review-rating" />
      <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How did it go?" className="bg-white" data-testid="review-comment-input" />
      <button type="submit" data-testid="review-submit-btn" className="rounded-lg bg-[#1E3D2F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#162E23]">Post review</button>
    </form>
  );
};

export const ReviewsSection = ({ userId, onChange }) => {
  const [data, setData] = useState({ items: [], average: null, count: 0 });
  const [options, setOptions] = useState([]);
  const load = useCallback(() => {
    api.get(`/users/${userId}/reviews`).then((r) => setData(r.data));
    api.get(`/users/${userId}/reviewable`).then((r) => setOptions(r.data));
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4" data-testid="reviews-section">
      {options.length > 0 && <ReviewForm userId={userId} options={options} onDone={() => { load(); onChange?.(); }} />}
      {data.items.length === 0 && <p className="text-sm text-stone-500" data-testid="reviews-empty">No reviews yet. Reviews can be left by neighbors after completing a request together.</p>}
      {data.items.map((r) => (
        <div key={r.review_id} className="rounded-xl border border-[#E5E3D8] bg-white p-5" data-testid={`review-${r.review_id}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Stars value={r.rating} />
            <span className="text-xs text-stone-500">{categoryOf(r.request_category).label} · {timeAgo(r.created_at)}</span>
          </div>
          {r.comment && <p className="mt-2 text-sm text-stone-700">{r.comment}</p>}
          <p className="mt-2 text-xs font-semibold text-stone-600">— {r.reviewer_name}</p>
        </div>
      ))}
    </div>
  );
};
