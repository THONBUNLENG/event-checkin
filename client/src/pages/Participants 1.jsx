import { useCallback, useEffect, useRef, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { QRCodeSVG } from "qrcode.react";

import html2canvas from "html2canvas";

import api from "../api";

import { Button, Input, Modal, PageHeader, Select } from "../components/ui";

const empty = {
  full_name: "",
  email: "",
  phone: "",
  gender: "",
  department_id: "",
  position_id: "",
};

export default function ParticipantsPage() {
  const [rows, setRows] = useState([]);
  const [deps, setDeps] = useState([]);
  const [positions, setPositions] = useState([]);
  const [events, setEvents] = useState([]);

  const [eventId, setEventId] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState(empty);

  const [card, setCard] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [error, setError] = useState("");

  const [params] = useSearchParams();

  // Reference to the card that will be printed/saved
  const cardRef = useRef(null);

  // Load data
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        participantsResponse,
        departmentsResponse,
        positionsResponse,
        eventsResponse,
      ] = await Promise.all([
        api.get("/participants"),
        api.get("/departments"),
        api.get("/positions"),
        api.get("/events"),
      ]);

      setRows(participantsResponse.data || []);
      setDeps(departmentsResponse.data || []);
      setPositions(positionsResponse.data || []);
      setEvents(eventsResponse.data || []);
    } catch (err) {
      console.error("Failed to load participants:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load participants. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data
  useEffect(() => {
    load();

    const selectedEvent = params.get("event");

    if (selectedEvent) {
      setEventId(selectedEvent);
    }
  }, [load, params]);

  function start(row = null) {
    setEditing(row);

    if (row) {
      setForm({
        full_name: row.full_name || "",
        email: row.email || "",
        phone: row.phone || "",
        gender: row.gender || "",
        department_id: row.department_id ?? "",
        position_id: row.position_id ?? "",
      });
    } else {
      setForm({ ...empty });
    }

    setOpen(true);
  }

  function closeForm() {
    if (saving) return;

    setOpen(false);
    setEditing(null);
    setForm({ ...empty });
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function save(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...form,
        department_id: form.department_id ? Number(form.department_id) : null,
        position_id: form.position_id ? Number(form.position_id) : null,
      };

      let participantId;

      if (editing) {
        await api.put(`/participants/${editing.id}`, payload);

        participantId = editing.id;
      } else {
        const response = await api.post("/participants", payload);

        participantId = response.data.id;
      }

      setOpen(false);
      setEditing(null);
      setForm({ ...empty });

      await load();

      // Automatically register new participant
      // when an event is selected.
      if (!editing && eventId) {
        await register(participantId);
      }
    } catch (err) {
      console.error("Failed to save participant:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to save participant. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function register(participantId) {
    try {
      const response = await api.post(`/events/${eventId}/participants`, {
        participant_id: participantId,
      });

      setCard(response.data);
    } catch (err) {
      console.error("Failed to register participant:", err);

      setError(
        err?.response?.data?.message ||
          "Participant was created, but event registration failed.",
      );
    }
  }

  async function del(id) {
    if (!window.confirm("Delete participant?")) {
      return;
    }

    try {
      setError("");

      await api.delete(`/participants/${id}`);

      await load();
    } catch (err) {
      console.error("Failed to delete participant:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to delete participant. Please try again.",
      );
    }
  }

  async function viewCard(row) {
    try {
      setError("");

      const { data } = await api.get(`/event-participants/${row.id}`);

      setCard(data);
    } catch (err) {
      console.error("Failed to load participation card:", err);

      alert("No event registration selected.");
    }
  }

  // PRINT ONLY CARD
  function printCard() {
    if (!cardRef.current) {
      return;
    }

    const cardHTML = cardRef.current.outerHTML;

    const printWindow = window.open("", "_blank", "width=600,height=900");

    if (!printWindow) {
      alert("Please allow pop-ups to print the participation card.");
      return;
    }

    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>
          Participation Card - ${card?.full_name || "Participant"}
        </title>

        <style>
          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
          }

          body {
            background: white;
            font-family: Arial, Helvetica, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }

          .event-card {
            position: relative;

            width: 54mm !important;
            height: 85.6mm !important;

            min-width: 54mm !important;
            min-height: 85.6mm !important;

            max-width: 54mm !important;
            max-height: 85.6mm !important;

            overflow: hidden;

            background-image: url("/images/card-bg.jpg") !important;
            background-size: cover !important;
            background-position: center !important;
            background-repeat: no-repeat !important;

            border-radius: 5mm;

            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;

            box-shadow: none !important;
          }

          @page {
            size: 54mm 85.6mm;
            margin: 0;
          }

          @media print {

            html,
            body {
              width: 54mm;
              height: 85.6mm;
              min-height: 85.6mm;
            }

            body {
              margin: 0;
              padding: 0;
            }

            .event-card {
              width: 54mm !important;
              height: 85.6mm !important;
              margin: 0;
            }
          }
        </style>
      </head>

      <body>

        ${cardHTML}

        <script>
          window.onload = function () {

            setTimeout(function () {

              window.print();

              window.onafterprint = function () {
                window.close();
              };

            }, 500);

          };
        </script>

      </body>
    </html>
  `);

    printWindow.document.close();
  }

  // SAVE CARD AS PNG
  async function saveCard() {
    if (!cardRef.current) {
      return;
    }

    try {
      setSavingCard(true);

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0B2A5B",
        scale: 3,
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 15000,
      });

      const image = canvas.toDataURL("image/png");

      const link = document.createElement("a");

      const safeName = (card?.full_name || "participant")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();

      link.download = `participation_card_${safeName}.png`;
      link.href = image;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to save card:", err);
      alert("Failed to save card. Please try again.");
    } finally {
      setSavingCard(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Participants"
        subtitle="Create participants and register them to an event."
        action={
          <Button onClick={() => start()} className="bg-[#0B2A5B] text-white">
            + Add Participant
          </Button>
        }
      />

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Event Selection */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border bg-white p-4 md:flex-row">
        <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">Select event to register new participant</option>

          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </Select>

        <span className="self-center text-xs text-slate-500">
          When an event is selected, creating a participant automatically
          registers them and generates a QR card.
        </span>
      </div>

      {/* Participants */}
      {loading ? (
        <div className="flex min-h-[250px] items-center justify-center">
          <div className="text-sm text-slate-500">Loading participants...</div>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center">
          <h3 className="text-lg font-semibold text-slate-700">
            No participants found
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Add your first participant to get started.
          </p>

          <Button
            onClick={() => start()}
            className="mt-5 bg-[#0B2A5B] text-white"
          >
            + Add Participant
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4 text-left">Participant</th>

                  <th className="p-4 text-left">Department</th>

                  <th className="p-4 text-left">Position</th>

                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-semibold">{row.full_name}</div>

                      <div className="text-xs text-slate-400">
                        {row.email || row.phone || "—"}
                      </div>
                    </td>

                    <td className="p-4">{row.department_name || "—"}</td>

                    <td className="p-4">{row.position_name || "—"}</td>

                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          className="text-green-600 hover:text-green-800"
                          onClick={() => viewCard(row)}
                        >
                          Card
                        </button>

                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => start(row)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="text-red-600 hover:text-red-800"
                          onClick={() => del(row.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Participant */}
      {open && (
        <Modal
          title={editing ? "Edit Participant" : "Add Participant"}
          onClose={closeForm}
        >
          <form onSubmit={save} className="space-y-3">
            <Input
              placeholder="Full name"
              required
              value={form.full_name}
              onChange={(e) => updateForm("full_name", e.target.value)}
            />

            <Input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => updateForm("email", e.target.value)}
            />

            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => updateForm("phone", e.target.value)}
            />

            <Select
              value={form.gender}
              onChange={(e) => updateForm("gender", e.target.value)}
            >
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>

            <Select
              value={form.department_id}
              onChange={(e) => updateForm("department_id", e.target.value)}
            >
              <option value="">Department</option>

              {deps.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>

            <Select
              value={form.position_id}
              onChange={(e) => updateForm("position_id", e.target.value)}
            >
              <option value="">Position</option>

              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </Select>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-[#0B2A5B] text-white disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editing
                  ? "Update Participant"
                  : "Save Participant"}
            </Button>
          </form>
        </Modal>
      )}

      {/* Participation Card */}
      {card && (
        <Modal title="Participation Card" onClose={() => setCard(null)}>
          {/* PORTRAIT CARD */}
          <div
            ref={cardRef}
            className="event-card mx-auto overflow-hidden rounded-[24px] shadow-2xl"
            style={{
              width: "320px",
              height: "505px",
              backgroundImage: "url('/images/card-bg.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: "#0B2A5B",
            }}
          >
            <div className="relative flex h-full flex-col bg-[#071d3f]/35 p-6">
              {/* TOP BRAND */}
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/30 bg-white/10 backdrop-blur-sm shadow-lg">
                  <span className="text-2xl font-black text-white">E</span>
                </div>

                <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">
                  EVENT PARTICIPATION
                </div>

                <h1 className="mt-2 text-xl font-extrabold leading-tight text-white">
                  {card.event_name}
                </h1>

                <div className="mx-auto mt-3 h-px w-20 bg-white/40" />
              </div>

              {/* PARTICIPANT */}
              <div className="mt-5 text-center">
                <div className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/60">
                  PARTICIPANT
                </div>

                <h2 className="mt-1 break-words text-2xl font-black leading-tight text-white">
                  {card.full_name}
                </h2>

                <p className="mt-2 text-sm font-semibold text-white/90">
                  {card.position_name || "Participant"}
                </p>

                <p className="text-xs text-white/65">
                  {card.department_name || "—"}
                </p>
              </div>

              {/* QR CODE */}
              <div className="mt-5 flex justify-center">
                <div className="rounded-2xl bg-white p-4 shadow-2xl">
                  <QRCodeSVG
                    value={card.qr_token}
                    size={155}
                    includeMargin={false}
                    level="H"
                  />
                </div>
              </div>

              {/* QR MESSAGE */}
              <div className="mt-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white">
                  Scan to Check In
                </p>

                <p className="mt-1 text-[9px] text-white/60">
                  Present this card at the event
                </p>
              </div>

              {/* BOTTOM */}
              <div className="mt-auto">
                <div className="border-t border-white/20 pt-4">
                  <div className="text-center">
                    <div className="text-[8px] font-semibold uppercase tracking-[0.25em] text-white/50">
                      REGISTRATION CODE
                    </div>

                    <div className="mt-1 text-sm font-bold tracking-[0.15em] text-white">
                      {card.registration_code}
                    </div>
                  </div>

                  {/* Contact */}
                  {(card.email || card.phone) && (
                    <div className="mt-3 text-center text-[8px] text-white/55">
                      {card.email && <div>{card.email}</div>}
                      {card.phone && <div>{card.phone}</div>}
                    </div>
                  )}
                </div>

                <div className="mt-4 text-center text-[7px] uppercase tracking-[0.3em] text-white/40">
                  Official Event Registration Card
                </div>
              </div>
            </div>
          </div>

          {/* CARD ACTIONS */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button
              type="button"
              onClick={printCard}
              className="bg-[#0B2A5B] text-white"
            >
              🖨️ Print Card
            </Button>

            <Button
              type="button"
              onClick={saveCard}
              disabled={savingCard}
              className="bg-green-600 text-white disabled:opacity-50"
            >
              {savingCard ? "Saving..." : "💾 Save Card"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
