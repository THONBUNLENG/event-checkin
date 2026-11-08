import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../api";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  MonitorPlay,
  ScanLine,
  Smartphone,
} from "lucide-react";
import { PageHeader, Select } from "../components/ui";

export default function CheckinPage() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  // auto = continuous scanning
  // single = scan one QR then stop
  const [scanMode, setScanMode] = useState("auto");

  const scanner = useRef(null);

  // Prevent multiple QR callbacks from being processed
  const processingQr = useRef(false);

  // Prevent the same QR from being scanned repeatedly
  const lastQr = useRef("");
  const lastScanTime = useRef(0);

  const regionId = "qr-reader";

  // --------------------------------------------------
  // Load events
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;

    async function loadEvents() {
      try {
        const { data } = await api.get("/events");

        if (!mounted) return;

        setEvents(data);

        // Automatically select active event
        const active = data.find(
          (e) => e.status === "active"
        );

        if (active) {
          setEventId(String(active.id));
        }
      } catch (err) {
        console.error("Failed to load events:", err);
      }
    }

    loadEvents();

    return () => {
      mounted = false;

      // Stop scanner when leaving page
      stopScanner();
    };
  }, []);

  // --------------------------------------------------
  // Stop scanner
  // --------------------------------------------------
  async function stopScanner() {
    const qr = scanner.current;

    // Clear reference immediately so another operation
    // cannot try to stop the same scanner
    scanner.current = null;

    processingQr.current = false;

    if (qr) {
      try {
        if (qr.isScanning) {
          await qr.stop();
        }
      } catch (err) {
        console.warn("Scanner stop:", err);
      }

      try {
        await qr.clear();
      } catch (err) {
        console.warn("Scanner clear:", err);
      }
    }

    setRunning(false);
  }

  // --------------------------------------------------
  // Send participant to Live Preview
  // --------------------------------------------------
  function sendToLivePreview(
    registration,
    type = "success"
  ) {
    if (!registration?.full_name) return;

    const payload = {
      type: "CHECKIN",

      name: registration.full_name,

      position:
        registration.position_name ||
        "Participant",

      department:
        registration.department_name ||
        "—",

      status: type,

      timestamp: Date.now(),
    };

    // Send to open Live Preview window
    try {
      const channel = new BroadcastChannel(
        "checkin-live-preview"
      );

      channel.postMessage(payload);
      channel.close();
    } catch (err) {
      console.warn(
        "BroadcastChannel error:",
        err
      );
    }

    // Save latest participant
    // Preview can recover this after refresh/open
    try {
      localStorage.setItem(
        "checkin-live-preview",
        JSON.stringify(payload)
      );
    } catch {}
  }

  // --------------------------------------------------
  // Start scanner
  // --------------------------------------------------
  async function startScanner() {
    // Event is required
    if (!eventId) {
      alert("Please select an event first.");
      return;
    }

    // Do not create another scanner
    if (scanner.current) {
      return;
    }

    setResult(null);
    setBusy(false);

    processingQr.current = false;
    lastQr.current = "";
    lastScanTime.current = 0;

    const qr = new Html5Qrcode(regionId);

    scanner.current = qr;

    try {
      await qr.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,

          qrbox: {
            width: 240,
            height: 240,
          },

          aspectRatio: 1,
        },

        // --------------------------------------------
        // QR successfully detected
        // --------------------------------------------
        async (decoded) => {
          // Another QR is currently processing
          if (processingQr.current) {
            return;
          }

          const now = Date.now();

          // Same QR detected again within 1.5 seconds
          if (
            decoded === lastQr.current &&
            now - lastScanTime.current < 1500
          ) {
            return;
          }

          // Lock processing
          processingQr.current = true;

          lastQr.current = decoded;
          lastScanTime.current = now;

          // ------------------------------------------
          // ONE-BY-ONE MODE
          // Stop camera first
          // ------------------------------------------
          if (scanMode === "single") {
            await stopScanner();
          }

          // ------------------------------------------
          // Check participant
          // ------------------------------------------
          await check(decoded);

          // ------------------------------------------
          // AUTO MODE
          // Camera stays running
          // ------------------------------------------
          if (scanMode === "auto") {
            setTimeout(() => {
              processingQr.current = false;
            }, 500);
          }
        },

        // QR scan failure callback
        () => {}
      );

      setRunning(true);
    } catch (err) {
      console.error(
        "Unable to start scanner:",
        err
      );

      scanner.current = null;

      setRunning(false);

      setResult({
        type: "error",
        message:
          "Unable to open camera. Please allow camera permission and use HTTPS.",
      });
    }
  }

  // --------------------------------------------------
  // Check QR with API
  // --------------------------------------------------
  async function check(qrToken) {
    setBusy(true);

    try {
      const { data } = await api.post(
        "/checkins/scan",
        {
          qrToken,
          eventId,
        }
      );

      setResult({
        type: "success",
        message: data.message,
        data,
      });

      // Send participant to Live Preview
      if (data.registration) {
        sendToLivePreview(
          data.registration,
          "success"
        );
      }
    } catch (err) {
      const d = err.response?.data;

      const type =
        d?.code === "ALREADY_CHECKED_IN"
          ? "warning"
          : "error";

      setResult({
        type,
        message:
          d?.message || "Scan failed",
        data: d,
      });

      // Send already-checked participant
      // to Live Preview too
      if (d?.registration) {
        sendToLivePreview(
          d.registration,
          type
        );
      }
    } finally {
      setBusy(false);
    }
  }

  // --------------------------------------------------
  // Open Live Preview
  // --------------------------------------------------
  function openLivePreview() {
    // Must select event
    if (!eventId) {
      return;
    }

    // Must start scanner first
    if (!running) {
      return;
    }

    const selectedEvent = events.find(
      (e) =>
        String(e.id) === String(eventId)
    );

    const preview = window.open(
      `/checkin-preview?eventId=${eventId}`,
      "checkin-live-preview",
      [
        "width=1920",
        "height=1080",
        "left=0",
        "top=0",
        "resizable=yes",
        "scrollbars=no",
      ].join(",")
    );

    // Popup blocked
    if (!preview) {
      alert(
        "Please allow pop-ups for this website to open Live Preview."
      );
      return;
    }

    // Send selected event to Preview
    if (selectedEvent) {
      setTimeout(() => {
        try {
          const channel =
            new BroadcastChannel(
              "checkin-live-preview"
            );

          channel.postMessage({
            type: "EVENT",
            event: selectedEvent,
          });

          channel.close();
        } catch (err) {
          console.warn(
            "Unable to send event to preview:",
            err
          );
        }
      }, 500);
    }
  }

  // --------------------------------------------------
  // Current selected event
  // --------------------------------------------------
  const selectedEvent = events.find(
    (e) =>
      String(e.id) === String(eventId)
  );

  return (
    <>
      <PageHeader
        title="Check-in"
        subtitle="Scan a participant QR code to mark attendance."
      />

      <div className="max-w-2xl mx-auto">
        <div className="bg-white border rounded-3xl p-5 md:p-7 shadow-sm">

          {/* ----------------------------------------
              EVENT
          ----------------------------------------- */}
          <label className="text-sm font-semibold">
            Select Event
          </label>

          <Select
            className="mt-2"
            value={eventId}
            disabled={running}
            onChange={(e) => {
              setEventId(e.target.value);
              setResult(null);
            }}
          >
            <option value="">
              Choose event
            </option>

            {events.map((e) => (
              <option
                key={e.id}
                value={e.id}
              >
                {e.name} — {e.status}
              </option>
            ))}
          </Select>

          {/* Selected event information */}
          {selectedEvent && (
            <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              <div className="font-semibold text-slate-800">
                {selectedEvent.name}
              </div>

              {selectedEvent.location && (
                <div className="text-sm text-slate-500 mt-1">
                  📍 {selectedEvent.location}
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------
              CAMERA
          ----------------------------------------- */}
          <div className="mt-5 rounded-2xl overflow-hidden bg-slate-950 min-h-[330px] grid place-items-center">

            <div
              id={regionId}
              className="w-full max-w-lg"
            />

            {!running && (
              <div className="text-center text-white p-8">
                <Camera
                  className="mx-auto mb-3 opacity-60"
                  size={42}
                />

                <p className="font-semibold">
                  Camera scanner ready
                </p>

                <p className="text-sm text-white/50 mt-1">
                  Select an event and start the scanner.
                </p>
              </div>
            )}

            {running && (
              <div className="absolute mt-[290px] pointer-events-none">
                <div className="flex items-center gap-2 bg-black/60 text-white rounded-full px-4 py-2 text-sm">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  {scanMode === "auto"
                    ? "Auto Scan Active"
                    : "One-by-One Scan Active"}
                </div>
              </div>
            )}
          </div>

          {/* ----------------------------------------
              SCAN MODE
          ----------------------------------------- */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">
                Scan Mode
              </label>

              {scanMode === "auto" ? (
                <span className="text-xs text-green-600 font-semibold">
                  Continuous
                </span>
              ) : (
                <span className="text-xs text-blue-600 font-semibold">
                  One at a time
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">

              {/* AUTO */}
              <button
                type="button"
                disabled={running}
                onClick={() =>
                  setScanMode("auto")
                }
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  scanMode === "auto"
                    ? "border-[#0B2A5B] bg-[#0B2A5B] text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                } ${
                  running
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <ScanLine size={19} />

                  <div className="font-bold">
                    Auto Scan
                  </div>
                </div>

                <div
                  className={`text-xs mt-2 ${
                    scanMode === "auto"
                      ? "text-white/70"
                      : "text-slate-500"
                  }`}
                >
                  Camera stays running.
                  Perfect for a scanner machine.
                </div>
              </button>

              {/* ONE BY ONE */}
              <button
                type="button"
                disabled={running}
                onClick={() =>
                  setScanMode("single")
                }
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  scanMode === "single"
                    ? "border-[#0B2A5B] bg-[#0B2A5B] text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                } ${
                  running
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <Smartphone size={19} />

                  <div className="font-bold">
                    One-by-One
                  </div>
                </div>

                <div
                  className={`text-xs mt-2 ${
                    scanMode === "single"
                      ? "text-white/70"
                      : "text-slate-500"
                  }`}
                >
                  Stops after every scan.
                  Good for mobile phones.
                </div>
              </button>
            </div>
          </div>

          {/* ----------------------------------------
              MAIN BUTTONS
          ----------------------------------------- */}
          <div className="grid grid-cols-2 gap-3 mt-4">

            {!running ? (
              <>
                {/* START */}
                <button
                  onClick={startScanner}
                  disabled={!eventId || busy}
                  className={`rounded-xl py-3 font-semibold transition ${
                    !eventId || busy
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-[#0B2A5B] text-white hover:bg-[#082247]"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Camera size={19} />

                    {eventId
                      ? "Start Scanner"
                      : "Select Event First"}
                  </span>
                </button>

                {/* LIVE PREVIEW DISABLED */}
                <button
                  type="button"
                  disabled
                  className="rounded-xl bg-slate-100 text-slate-400 py-3 font-semibold cursor-not-allowed"
                  title="Start Scanner first"
                >
                  <span className="flex items-center justify-center gap-2">
                    <MonitorPlay size={19} />
                    Live Preview
                  </span>
                </button>
              </>
            ) : (
              <>
                {/* STOP */}
                <button
                  onClick={stopScanner}
                  className="rounded-xl bg-red-100 text-red-700 py-3 font-semibold hover:bg-red-200 transition"
                >
                  <span className="flex items-center justify-center gap-2">
                    <XCircle size={19} />
                    Stop Scanner
                  </span>
                </button>

                {/* LIVE PREVIEW */}
                <button
                  onClick={openLivePreview}
                  disabled={!eventId || !running}
                  className="rounded-xl bg-[#D99B00] text-white py-3 font-semibold hover:bg-[#bd8600] disabled:bg-slate-200 disabled:text-slate-400 transition"
                >
                  <span className="flex items-center justify-center gap-2">
                    <MonitorPlay size={19} />
                    Live Preview
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ------------------------------------------
            RESULT
        ------------------------------------------- */}
        {result && (
          <div
            className={`mt-5 rounded-3xl p-6 text-center ${
              result.type === "success"
                ? "bg-green-50 text-green-900"
                : result.type === "warning"
                  ? "bg-amber-50 text-amber-900"
                  : "bg-red-50 text-red-900"
            }`}
          >
            {result.type === "success" ? (
              <CheckCircle2
                className="mx-auto"
                size={48}
              />
            ) : result.type === "warning" ? (
              <AlertTriangle
                className="mx-auto"
                size={48}
              />
            ) : (
              <XCircle
                className="mx-auto"
                size={48}
              />
            )}

            <h2 className="text-xl font-bold mt-3">
              {result.type === "success"
                ? "CHECKED IN"
                : result.type === "warning"
                  ? "ALREADY CHECKED IN"
                  : "SCAN ERROR"}
            </h2>

            <p className="mt-2">
              {result.message}
            </p>

            {result.data?.registration && (
              <>
                <div className="text-2xl font-bold mt-4">
                  {
                    result.data.registration
                      .full_name
                  }
                </div>

                <div className="text-sm opacity-70">
                  {result.data.registration
                    .position_name ||
                    "Participant"}{" "}
                  ·{" "}
                  {result.data.registration
                    .department_name ||
                    "—"}
                </div>
              </>
            )}

            {/* --------------------------------------
                SCAN NEXT
                Only One-by-One mode
            --------------------------------------- */}
            {scanMode === "single" &&
              !running && (
                <button
                  onClick={startScanner}
                  disabled={!eventId || busy}
                  className="mt-5 px-6 py-3 rounded-xl bg-white/80 hover:bg-white font-semibold shadow-sm disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <Camera size={18} />
                    Scan Next
                  </span>
                </button>
              )}
          </div>
        )}
      </div>
    </>
  );
}