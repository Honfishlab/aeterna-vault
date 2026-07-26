import React, { useState } from "react";
import { Images, Loader2 } from "lucide-react";

export function GooglePhotosPicker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const choose = async () => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/integrations/google-photos/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const session = await response.json();
    if (!response.ok) {
      setError(session.code === "GOOGLE_PHOTOS_SCOPE_REQUIRED" ? "Disconnect and reconnect Google once to grant Photos Picker access." : session.error || "Google Photos is unavailable.");
      setLoading(false);
      return;
    }
    window.open(session.pickerUri, "aeterna-google-photos", "popup=yes,width=900,height=760");
    const poll = window.setInterval(async () => {
      const statusResponse = await fetch("/api/integrations/google-photos/session/" + encodeURIComponent(session.id));
      const status = await statusResponse.json();
      if (!status.ready) return;
      window.clearInterval(poll);
      const queueResponse = await fetch("/api/integrations/google-photos/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: session.id }) });
      const queued = await queueResponse.json();
      if (queueResponse.ok) window.dispatchEvent(new CustomEvent("aeterna-import-jobs", { detail: queued.jobs || [] }));
      else setError(queued.error || "Selected Photos could not be queued.");
      setLoading(false);
    }, 2000);
  };

  return (
    <div>
      <button onClick={choose} disabled={loading} className="gold-filled-btn px-3 py-2 text-xs flex items-center gap-1 disabled:opacity-50">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Images className="w-3.5 h-3.5" />} Google Photos
      </button>
      {error && <p className="text-[10px] text-rose-300 mt-1 max-w-xs">{error}</p>}
    </div>
  );
}
