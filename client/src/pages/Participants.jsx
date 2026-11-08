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
      "width=600,height=900"
    );

    if (!printWindow) {
      alert(
        "Please allow pop-ups to print the participation card."
      );
      return;
    }

    const cardHTML = cardRef.current.outerHTML;

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
          Participation Card - ${card?.full_name || "Participant"
      }
        </title>

        <style>

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;

            width: 85.6mm;
            height: 123.4mm;

            background: white;

            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            size: 85.6mm 123.4mm;
            margin: 0;
          }

          .print-wrapper {
            width: 85.6mm;
            height: 123.4mm;

            margin: 0;
            padding: 0;

            overflow: hidden;
          }

          .print-card {
            position: relative;

            width: 460px;
            height: 663px;

            transform: scale(0.7033);
            transform-origin: top left;

            flex: none;

            overflow: hidden;

            border: 2px solid white;
            border-radius: 28px;

            background-size: cover !important;
            background-position: center !important;
            background-repeat: no-repeat !important;

            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .card-preview-wrapper {
            width: 85.6mm;
            height: 123.4mm;
            padding: 0;
            margin: 0;
          }

          .card-logo {
            width: 100%;
            height: 150px;

            display: flex;
            justify-content: center;
            align-items: flex-end;

            padding-top: 1px;
          }

          .card-logo img {
            width: auto;
            height: 92px;

            object-fit: contain;
            display: block;
          }

          .card-event-title {
            width: 90%;
            margin: 28px auto 0;
            text-align: center;
            color: white;
            font-size: 16px;
            line-height: 1.65;
            font-weight: 700;
            letter-spacing: 1px;
            min-height: 100px;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .card-divider {
            width: 50%;
            height: 34px;

            margin: 2px auto 0;

            display: flex;
            justify-content: center;
            align-items: center;
          }

          .card-divider img {
            width: 100%;
            height: auto;
            object-fit: contain;
            display: block;
          }

          .card-scan-title {
            margin-top: 20px;
            text-align: center;
            color: white;
            font-size: 12px;
            font-weight: 700;
            line-height: 1.5;
          }

          .card-qr {
            width: 120px;
            height: 120px;
            margin: 14px auto 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            border-radius: 17px;
            overflow: hidden;
          }
          .card-qr svg {
            display: block;
            width: 120px;
            height: 120px;
          }

          .card-name {
            width: 90%;

            margin: 25px auto 0;

            text-align: center;

            color: white;

            font-size: 16px;

            line-height: 1.35;

            font-weight: 700;
          }

          .card-position {
            width: 90%;
            margin: 4px auto 0;
            text-align: center;
            color: white;
            font-family: "Poppins", "Kantumruy Pro", Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
          }

          .card-location {
            position: absolute;

            left: 35px;
            right: 35px;

            bottom: 50px;

            text-align: center;

            color: white;

            font-size: 12px;

            line-height: 1.5;

            font-weight: 600;
          }

          .event-card-font {
            font-family:
              "Khmer OS Muol Light",
              "Kantumruy Pro",
              "Noto Sans Khmer",
              "Poppins",
              sans-serif !important;
          }

          img {
            display: block;
          }

          svg {
            display: block;
          }

        </style>
      </head>

      <body>

        <div class="print-wrapper">
          ${absoluteCardHTML}
        </div>

        <script>

          async function preparePrint() {

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

            if (document.fonts) {
              await document.fonts.ready;
            }

            setTimeout(() => {

              window.focus();
              window.print();

            }, 700);
          }

          window.addEventListener(
            "load",
            preparePrint
          );

          window.addEventListener(
            "afterprint",
            () => {
              setTimeout(() => {
                window.close();
              }, 300);
            }
          );

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
          <div className="card-preview-wrapper">
            <div
              ref={cardRef}
              className="print-card"
              style={{
                backgroundImage: "url('/images/bg_card1.png')",
              }}
            >
              {/* LOGO */}
              <div className="card-logo">
                <img
                  src="/images/image 7.png"
                  alt="BELTEI GROUP"
                />
              </div>

              {/* EVENT TITLE */}
              <div className="card-event-title event-card-font">
                {card.event_name}
              </div>

              {/* GOLD DIVIDER */}
              <div className="card-divider">
                <img
                  src="/images/kbach.png"
                  alt=""
                />
              </div>

              {/* QR INSTRUCTION */}
              <div className="card-scan-title event-card-font">
                សូមស្កេនដើម្បីចូលរួម
              </div>

              {/* QR */}
              <div className="card-qr">
                <QRCodeSVG
                  value={card.qr_token}
                  fgColor="#0A3653"
                  bgColor="#FFFFFF"
                  size={150}
                  includeMargin={true}
                />
              </div>

              {/* NAME */}
              <div className="card-name event-card-font">
                {card.full_name}
              </div>

              {/* POSITION / DEPARTMENT */}
              <div className="card-position">
                {card.position_name || "Participant"}
                {" · "}
                {card.department_name || "—"}
              </div>

              {/* LOCATION */}
              <div className="card-location event-card-font">
                {card.location}
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
              Print Card
            </Button>

            <Button
              type="button"
              onClick={saveCard}
              disabled={savingCard}
              className="bg-green-600 text-white disabled:opacity-50"
            >
              {savingCard ? "Saving..." : "Save Card"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}