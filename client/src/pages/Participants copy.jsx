import { useCallback, useEffect, useRef, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { QRCodeSVG } from "qrcode.react";

import html2canvas from "html2canvas";

import api from "../api";

import {
  Button,
  Input,
  Modal,
  PageHeader,
  Select,
} from "../components/ui";

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
          "Failed to load participants. Please try again."
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
        department_id: form.department_id
          ? Number(form.department_id)
          : null,
        position_id: form.position_id
          ? Number(form.position_id)
          : null,
      };

      let participantId;

      if (editing) {
        await api.put(
          `/participants/${editing.id}`,
          payload
        );

        participantId = editing.id;
      } else {
        const response = await api.post(
          "/participants",
          payload
        );

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
          "Failed to save participant. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function register(participantId) {
    try {
      const response = await api.post(
        `/events/${eventId}/participants`,
        {
          participant_id: participantId,
        }
      );

      setCard(response.data);
    } catch (err) {
      console.error("Failed to register participant:", err);

      setError(
        err?.response?.data?.message ||
          "Participant was created, but event registration failed."
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
          "Failed to delete participant. Please try again."
      );
    }
  }

  async function viewCard(row) {
    try {
      setError("");

      const { data } = await api.get(
        `/event-participants/${row.id}`
      );

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

  const printWindow = window.open(
    "",
    "_blank",
    "width=600,height=800"
  );

  if (!printWindow) {
    alert(
      "Please allow pop-ups to print the participation card."
    );
    return;
  }

  const cardHTML = cardRef.current.outerHTML;

  // Convert relative image paths to absolute URLs
  const absoluteCardHTML = cardHTML
    .replace(
      /src="\/images\//g,
      `src="${window.location.origin}/images/`
    )
    .replace(
      /url\(['"]?\/images\//g,
      `url('${window.location.origin}/images/`
    );

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="km">
      <head>
        <meta charset="UTF-8" />

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
            background: white;
          }

          body {
            font-family:
              "Poppins",
              "Kantumruy Pro",
              Arial,
              sans-serif;
          }

          .print-wrapper {
            display: flex;
            justify-content: center;
            align-items: flex-start;
            width: 100%;
            padding: 20px;
          }

          .print-card {
            width: 85.6mm;
            min-height: 54mm;
            overflow: hidden;

            background-size: cover !important;
            background-position: center !important;
            background-repeat: no-repeat !important;

            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          img {
            display: block;
          }

          svg {
            display: block;
          }

          .event-card-font {
            font-family:
              "Khmer OS Muol Light",
              "Kantumruy Pro",
              "Poppins",
              sans-serif !important;
          }

          @media print {

            @page {
              size: auto;
              margin: 0;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              width: 100%;
              background: white;
            }

            .print-wrapper {
              padding: 0;
              width: 100%;
            }

            .print-card {
              width: 85.6mm;
              min-height: 54mm;
              margin: 10mm auto;
            }
          }
        </style>
      </head>

      <body>

        <div class="print-wrapper">
          ${absoluteCardHTML}
        </div>

        <script>
          async function preparePrint() {

            // Wait for images
            const images = Array.from(
              document.images
            );

            await Promise.all(
              images.map((img) => {

                if (img.complete) {
                  return Promise.resolve();
                }

                return new Promise((resolve) => {

                  img.onload = resolve;
                  img.onerror = resolve;

                });

              })
            );

            // Wait for fonts
            if (document.fonts) {
              await document.fonts.ready;
            }

            // Give browser time to render background images
            setTimeout(() => {

              window.focus();
              window.print();

            }, 1000);
          }

          window.onload = preparePrint;

          window.onafterprint = function () {

            setTimeout(() => {
              window.close();
            }, 300);

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
      backgroundColor: null,
      scale: 2,
      useCORS: true,
    });

    const image = canvas.toDataURL("image/png");

    const link = document.createElement("a");

    // Keep Khmer characters
    const safeName = (card?.full_name || "participant")
      .normalize("NFC")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, "_")
      .trim();

    link.download = `card_${safeName}.png`;

    link.href = image;

    link.click();
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
          <Button
            onClick={() => start()}
            className="bg-[#0B2A5B] text-white"
          >
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
        <Select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        >
          <option value="">
            Select event to register new participant
          </option>

          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </Select>

        <span className="self-center text-xs text-slate-500">
          When an event is selected, creating a participant
          automatically registers them and generates a QR card.
        </span>
      </div>

      {/* Participants */}
      {loading ? (
        <div className="flex min-h-[250px] items-center justify-center">
          <div className="text-sm text-slate-500">
            Loading participants...
          </div>
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
                  <th className="p-4 text-left">
                    Participant
                  </th>

                  <th className="p-4 text-left">
                    Department
                  </th>

                  <th className="p-4 text-left">
                    Position
                  </th>

                  <th className="p-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t hover:bg-slate-50"
                  >
                    <td className="p-4">
                      <div className="font-semibold">
                        {row.full_name}
                      </div>

                      <div className="text-xs text-slate-400">
                        {row.email ||
                          row.phone ||
                          "—"}
                      </div>
                    </td>

                    <td className="p-4">
                      {row.department_name || "—"}
                    </td>

                    <td className="p-4">
                      {row.position_name || "—"}
                    </td>

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
          title={
            editing
              ? "Edit Participant"
              : "Add Participant"
          }
          onClose={closeForm}
        >
          <form
            onSubmit={save}
            className="space-y-3"
          >
            <Input
              placeholder="Full name"
              required
              value={form.full_name}
              onChange={(e) =>
                updateForm(
                  "full_name",
                  e.target.value
                )
              }
            />

            <Input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) =>
                updateForm(
                  "email",
                  e.target.value
                )
              }
            />

            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) =>
                updateForm(
                  "phone",
                  e.target.value
                )
              }
            />

            <Select
              value={form.gender}
              onChange={(e) =>
                updateForm(
                  "gender",
                  e.target.value
                )
              }
            >
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">
                Female
              </option>
              <option value="other">Other</option>
            </Select>

            <Select
              value={form.department_id}
              onChange={(e) =>
                updateForm(
                  "department_id",
                  e.target.value
                )
              }
            >
              <option value="">Department</option>

              {deps.map((department) => (
                <option
                  key={department.id}
                  value={department.id}
                >
                  {department.name}
                </option>
              ))}
            </Select>

            <Select
              value={form.position_id}
              onChange={(e) =>
                updateForm(
                  "position_id",
                  e.target.value
                )
              }
            >
              <option value="">Position</option>

              {positions.map((position) => (
                <option
                  key={position.id}
                  value={position.id}
                >
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
        <Modal
          title="Participation Card"
          size="lg"
          onClose={() => setCard(null)}
        >
          {/* CARD AREA */}
          <div
            ref={cardRef}
            className="print-card mx-auto max-w-[500px] rounded-2xl border-2 bg-white p-6 text-center"
            style={{
              backgroundImage: "url('/images/bg_card.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
          <div className=" w-full flex justify-center items-center">
              <img className=" h-24 pt-4 flex  items-center" src="/images/image 7.png" alt=""/>
            </div>
            <p className="text-[20px] event-card-font capitalize leading-8  tracking-wider text-white pt-4">
              {card.event_name}
            </p>
            <div className=" w-full flex justify-center items-center">
              <img className=" h-10 flex  items-center" src="/images/kbach.png" alt=""/>
            </div>
            <h1 className="text-[14px] event-card-font capitalize tracking-widest text-white pt-2">
              សូមស្កេនដើម្បីចូលរូម
            </h1>
            <div className="my-5 flex justify-center">
              <QRCodeSVG
                value={card.qr_token}
                className=" rounded-xl"
                fgColor="#0A3653"
                size={150}
                includeMargin
              />
            </div>

            <p className="text-2xl​ font-semibold event-card-font  text-white">
              {card.full_name}
            </p>

            <p className="mt-1 event-card-font text-slate-100">
              {card.position_name ||
                "Participant"}{" "}
              ·{" "}
              {card.department_name || "—"}
            </p>
            <p className="event-card-font tracking-wider leading-5 text-[12px] mt-1 pt-4 mb-8 text-white">
              {card.location}
            </p>
          </div>

          {/* CARD ACTIONS */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button
              type="button"
              onClick={printCard}
              className="bg-[#0B2A5B] text-white"
            >
              Print Card
            </Button>

            <Button
              type="button"
              onClick={saveCard}
              disabled={savingCard}
              className="bg-green-600 text-white disabled:opacity-50"
            >
              {savingCard
                ? "Saving..."
                : "Save Card"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}