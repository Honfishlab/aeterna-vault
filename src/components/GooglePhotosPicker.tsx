import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Images, Loader2, RefreshCw } from "lucide-react";

type Phase = "idle" | "selecting" | "queueing" | "queued";

export function GooglePhotosPicker({ onQueued }: { onQueued?: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const timerRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => () => stopPolling(), []);

  const queueSelection = async (id: string) => {
    setPhase("queueing");
    const response = await fetch("/api/integrations/google-photos/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError((body.error || "Selected Photos could not be queued.") + (body.code ? " (" + body.code + ")" : ""));
      setPhase("selecting");
      return;
    }
    window.dispatchEvent(new CustomEvent("aeterna-import-jobs", { detail: body.jobs || [] }));
    if (body.jobs?.length) onQueued?.();
    setPhase("queued");
    setError(body.jobs?.length ? "" : "Google returned no supported photos or videos for this selection.");
    stopPolling();
  };

  const checkSelection = async (id = sessionId) => {
    if (!id || phase === "queueing" || phase === "queued") return;
    const response = await fetch("/api/integrations/google-photos/session/" + encodeURIComponent(id));
    const body = await response.json();
    if (!response.ok) {
      setError((body.error || "Unable to check the Photos selection.") + (body.code ? " (" + body.code + ")" : ""));
      stopPolling();
      return;
    }
    if (body.ready) await queueSelection(id);
  };

  const choose = async () => {
    const popup = window.open("", "aeterna-google-photos", "popup=yes,width=900,height=760");
    if (!popup) {
      setError("Allow popups for Aeterna Vault, then try again.");
      setPhase("idle");
      return;
    }
    stopPolling();
    setError("");
    setPhase("selecting");
    const response = await fetch("/api/integrations/google-photos/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const session = await response.json();
    if (!response.ok) {
      setError(session.code === "GOOGLE_PHOTOS_SCOPE_REQUIRED"
        ? "Disconnect and reconnect Google once to grant Photos Picker access."
        : (session.error || "Google Photos is unavailable.") + (session.code ? " (" + session.code + ")" : ""));
      popup.close();
      setPhase("idle");
      return;
    }
    setSessionId(session.id);
    popup.location.replace(session.pickerUri);
    window.dispatchEvent(new CustomEvent("aeterna-google-photos-session", { detail: { id: session.id } }));
    onQueued?.();
    setPhase("queued");
  };

  useEffect(() => {
    const reselect = () => void choose();
    window.addEventListener("aeterna-reselect-google-photos", reselect);
    return () => window.removeEventListener("aeterna-reselect-google-photos", reselect);
  }, []);

  return (
    <div className="max-w-xs">
      {phase === "idle" ? (
        <button onClick={choose} className="gold-filled-btn px-3 py-2 text-xs flex items-center gap-1">
          <Images className="w-3.5 h-3.5" /> Google Photos
        </button>
      ) : phase === "queued" ? (
        <button onClick={choose} className="gold-beveled-btn px-3 py-2 text-xs flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Select more Photos
        </button>
      ) : (
        <button onClick={() => checkSelection()} disabled={phase === "queueing"} className="gold-filled-btn px-3 py-2 text-xs flex items-center gap-1 disabled:opacity-60">
          {phase === "queueing" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {phase === "queueing" ? "Queueing selection..." : "Done selecting? Check now"}
        </button>
      )}
      {phase === "selecting" && !error && <p className="text-[10px] text-[#C8B1E4] mt-1">Click Done in Google Photos, then this will update automatically.</p>}
      {error && <p className="text-[10px] text-rose-300 mt-1">{error}</p>}
    </div>
  );
}
