import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";

export const ChatPanel = ({ requestId, me, canSend }) => {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const endRef = useRef(null);

  const load = useCallback(() => {
    api.get(`/requests/${requestId}/messages`).then((r) => setMsgs(r.data)).catch(() => {});
  }, [requestId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [msgs.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const { data } = await api.post(`/requests/${requestId}/messages`, { text });
      setMsgs((m) => [...m, data]);
      setText("");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="flex h-[520px] flex-col rounded-xl border border-[#E5E3D8] bg-white" data-testid="chat-panel">
      <div className="border-b border-[#E5E3D8] px-5 py-3">
        <p className="font-heading font-semibold text-stone-900">Private chat</p>
        <p className="text-xs text-stone-500">Coordinate pickup times and details. Keep conversations on Parent Link.</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-[#FAFAF7] p-4" data-testid="chat-messages">
        {msgs.length === 0 && <p className="pt-10 text-center text-sm text-stone-500">No messages yet. Say hello!</p>}
        {msgs.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`} data-testid={`chat-message-${m.message_id}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "rounded-br-sm bg-[#1E3D2F] text-white" : "rounded-bl-sm border border-[#E5E3D8] bg-white text-stone-800"}`}>
                {!mine && <p className="mb-0.5 text-[11px] font-semibold text-[#588157]">{m.sender_name}</p>}
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-stone-300" : "text-stone-400"}`}>{new Date(m.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {canSend && (
        <form onSubmit={send} className="flex gap-2 border-t border-[#E5E3D8] p-3">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message..." data-testid="chat-input"
            className="h-11 flex-1 rounded-lg border border-[#E5E3D8] bg-white px-3 text-sm outline-none focus:border-[#1E3D2F]" />
          <button type="submit" data-testid="send-chat-msg-btn" aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#D96838] text-white transition-colors hover:bg-[#BE5527]">
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
};
