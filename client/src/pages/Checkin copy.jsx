import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../api";
import { CheckCircle2, XCircle, AlertTriangle, Camera } from "lucide-react";
import { PageHeader, Select } from "../components/ui";

export default function CheckinPage() {
  const [events, setEvents] = useState([]),
    [eventId, setEventId] = useState(""),
    [running, setRunning] = useState(false),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false);
  const scanner = useRef(null);
  const regionId = "qr-reader";
  useEffect(() => {
    api.get("/events").then((r) => {
      setEvents(r.data);
      const active = r.data.find((e) => e.status === "active");
      if (active) setEventId(String(active.id));
    });
    return () => stopScanner();
  }, []);
  async function stopScanner() {
    try {
      if (scanner.current) {
        await scanner.current.stop();
        await scanner.current.clear();
      }
    } catch {}
    scanner.current = null;
    setRunning(false);
  }
  async function startScanner() {
    if (!eventId) return alert("Select an event first");
    setResult(null);
    const qr = new Html5Qrcode(regionId);
    scanner.current = qr;
    try {
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decoded) => {
          await stopScanner();
          await check(decoded);
        },
        () => {},
      );
      setRunning(true);
    } catch (e) {
      setResult({
        type: "error",
        message:
          "Unable to open camera. Please allow camera permission and use HTTPS.",
      });
      scanner.current = null;
    }
  }
  async function check(qrToken) {
    setBusy(true);
    try {
      const { data } = await api.post("/checkins/scan", { qrToken, eventId });
      setResult({ type: "success", message: data.message, data });
    } catch (err) {
      const d = err.response?.data;
      setResult({
        type: d?.code === "ALREADY_CHECKED_IN" ? "warning" : "error",
        message: d?.message || "Scan failed",
        data: d,
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Check-in"
        subtitle="Scan a participant QR code to mark attendance."
      />
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border rounded-3xl p-5 md:p-7 shadow-sm">
          <label className="text-sm font-semibold">Select Event</label>
          <Select
            className="mt-2"
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value);
              setResult(null);
            }}
          >
            <option value="">Choose event</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.status}
              </option>
            ))}
          </Select>
          <div className="mt-5 rounded-2xl overflow-hidden bg-slate-950 min-h-[330px] grid place-items-center">
            <div id={regionId} className="w-full max-w-lg"></div>
            {!running && (
              <div className="text-center text-white p-8">
                <Camera className="mx-auto mb-3 opacity-60" size={42} />
                <p className="font-semibold">Camera scanner ready</p>
                <p className="text-sm text-white/50 mt-1">
                  Press Start Scanner and point at the participant QR.
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            {!running ? (
              <button
                onClick={startScanner}
                disabled={!eventId || busy}
                className="flex-1 rounded-xl bg-[#0B2A5B] text-white py-3 font-semibold"
              >
                Start Scanner
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="flex-1 rounded-xl bg-slate-200 py-3 font-semibold"
              >
                Stop Scanner
              </button>
            )}
          </div>
        </div>
        {result && (
          <div
            className={`mt-5 rounded-3xl p-6 text-center ${result.type === "success" ? "bg-green-50 text-green-900" : result.type === "warning" ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-900"}`}
          >
            {result.type === "success" ? (
              <CheckCircle2 className="mx-auto" size={48} />
            ) : result.type === "warning" ? (
              <AlertTriangle className="mx-auto" size={48} />
            ) : (
              <XCircle className="mx-auto" size={48} />
            )}
            <h2 className="text-xl font-bold mt-3">
              {result.type === "success"
                ? "CHECKED IN"
                : result.type === "warning"
                  ? "ALREADY CHECKED IN"
                  : "SCAN ERROR"}
            </h2>
            <p className="mt-2">{result.message}</p>
            {result.data?.registration && (
              <>
                <div className="text-2xl font-bold mt-4">
                  {result.data.registration.full_name}
                </div>
                <div className="text-sm opacity-70">
                  {result.data.registration.position_name || "Participant"} ·{" "}
                  {result.data.registration.department_name || "—"}
                </div>
              </>
            )}
            {result.type !== "error" && (
              <button
                onClick={startScanner}
                className="mt-5 px-5 py-2.5 rounded-xl bg-white/70 font-semibold"
              >
                Scan Next
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
