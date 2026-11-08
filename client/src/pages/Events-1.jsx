import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api";
import { Button, Input, Modal, PageHeader, Select } from "../components/ui";

const empty = {
  name: "",
  event_code: "",
  description: "",
  location: "",
  start_date: "",
  end_date: "",
  start_time: "",
  end_time: "",
  capacity: "",
  status: "draft",

  // Event card design
  background_image: "",
  logo_image: "",
};

export default function EventsPage() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...empty });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // LOAD EVENTS
  // ============================================================

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/events");

      setRows(response.data || []);
    } catch (err) {
      console.error("Failed to load events:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load events. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // IMPORTANT:
  // useEffect itself must NOT be async.
  useEffect(() => {
    load();
  }, [load]);

  // ============================================================
  // IMAGE -> BASE64
  // ============================================================

  function imageToBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve("");
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result);
      };

      reader.onerror = () => {
        reject(new Error("Failed to read image."));
      };

      reader.readAsDataURL(file);
    });
  }

  // ============================================================
  // SELECT IMAGE
  // ============================================================

  async function handleImageChange(field, file) {
    if (!file) return;

    // Only allow images
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    // Optional size protection
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB.");
      return;
    }

    try {
      const base64 = await imageToBase64(file);

      setForm((current) => ({
        ...current,
        [field]: base64,
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to load image.");
    }
  }

  // ============================================================
  // START CREATE / EDIT
  // ============================================================

  function start(row = null) {
    setEditing(row);

    if (row) {
      setForm({
        name: row.name || "",
        event_code: row.event_code || "",
        description: row.description || "",
        location: row.location || "",

        start_date: row.start_date
          ? String(row.start_date).slice(0, 10)
          : "",

        end_date: row.end_date
          ? String(row.end_date).slice(0, 10)
          : "",

        start_time: row.start_time
          ? String(row.start_time).slice(0, 5)
          : "",

        end_time: row.end_time
          ? String(row.end_time).slice(0, 5)
          : "",

        capacity: row.capacity ?? "",
        status: row.status || "draft",

        background_image: row.background_image || "",
        logo_image: row.logo_image || "",
      });
    } else {
      setForm({ ...empty });
    }

    setOpen(true);
  }

  // ============================================================
  // CLOSE MODAL
  // ============================================================

  function closeModal() {
    if (saving) return;

    setOpen(false);
    setEditing(null);
    setForm({ ...empty });
  }

  // ============================================================
  // FORM UPDATE
  // ============================================================

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // ============================================================
  // SAVE EVENT
  // ============================================================

  async function save(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (editing) {
        await api.put(`/events/${editing.id}`, form);
      } else {
        await api.post("/events", form);
      }

      closeModal();

      await load();
    } catch (err) {
      console.error("Failed to save event:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to save event. Please check your information."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // DELETE
  // ============================================================

  async function del(id) {
    if (!window.confirm("Delete this event?")) {
      return;
    }

    try {
      setError("");

      await api.delete(`/events/${id}`);

      await load();
    } catch (err) {
      console.error("Failed to delete event:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to delete event. Please try again."
      );
    }
  }

  // ============================================================
  // REMOVE IMAGE
  // ============================================================

  function removeImage(field) {
    setForm((current) => ({
      ...current,
      [field]: "",
    }));
  }

  return (
    <>
      <PageHeader
        title="Events"
        subtitle="Create and manage your events."
        action={
          <Button
            onClick={() => start()}
            className="bg-[#0B2A5B] text-white"
          >
            + Create Event
          </Button>
        }
      />

      {/* ERROR */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="flex min-h-[250px] items-center justify-center">
          <div className="text-sm text-slate-500">
            Loading events...
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center">
          <h3 className="text-lg font-semibold text-slate-700">
            No events found
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Create your first event to get started.
          </p>

          <Button
            onClick={() => start()}
            className="mt-5 bg-[#0B2A5B] text-white"
          >
            + Create Event
          </Button>
        </div>
      ) : (
        /* ========================================================
           EVENT CARDS
        ======================================================== */

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="relative overflow-hidden rounded-2xl border bg-white shadow-sm"
            >
              {/* Dynamic background */}
              {row.background_image ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${row.background_image})`,
                  }}
                />
              ) : null} 
              {/* Overlay */}
              <div
                className={`absolute inset-0 ${
                  row.background_image
                    ? "bg-white/85"
                    : "bg-white"
                }`}
              />
   
              {/* Content */}
              <div className="relative p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
                    {row.status}
                  </span>

                  <span className="text-xs text-slate-400">
                    {row.event_code}
                  </span>
                </div>

                {/* Logo */}  
                {row.logo_image && (
                  <div className="mt-4">
                    <img
                      src={row.logo_image}
                      alt={`${row.name} logo`}
                      className="h-14 w-14 rounded-xl object-contain"
                    />
                  </div>
                )}

                <h3 className="mt-4 text-lg font-bold">
                  {row.name}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {row.location || "No location"}
                </p>

                <p className="mt-3 text-xs text-slate-400">
                  {row.start_date
                    ? String(row.start_date).slice(0, 10)
                    : "-"}{" "}
                  →{" "}
                  {row.end_date
                    ? String(row.end_date).slice(0, 10)
                    : "-"}
                </p>

                {row.capacity && (
                  <p className="mt-2 text-xs text-slate-400">
                    Capacity: {row.capacity}
                  </p>
                )}

                <div className="mt-5 flex gap-2">
                  <Link
                    className="flex-1 rounded-xl bg-blue-50 py-2 text-center text-sm font-semibold text-blue-700"
                    to={`/participants?event=${row.id}`}
                  >
                    Participants
                  </Link>

                  <button
                    type="button"
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                    onClick={() => start(row)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="rounded-xl border px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    onClick={() => del(row.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==========================================================
         CREATE / EDIT EVENT
      ========================================================== */}

      {open && (
        <Modal
          title={editing ? "Edit Event" : "Create Event"}
          onClose={closeModal}
        >
          <form
            onSubmit={save}
            className="max-h-[80vh] space-y-4 overflow-y-auto pr-1"
          >
            <Input
              placeholder="Event name"
              required
              value={form.name}
              onChange={(e) =>
                updateForm("name", e.target.value)
              }
            />

            <Input
              placeholder="Event code"
              required
              value={form.event_code}
              onChange={(e) =>
                updateForm("event_code", e.target.value)
              }
            />

            <Input
              placeholder="Location"
              value={form.location}
              onChange={(e) =>
                updateForm("location", e.target.value)
              }
            />

            <textarea
              className="w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Description"
              rows={4}
              value={form.description}
              onChange={(e) =>
                updateForm("description", e.target.value)
              }
            />

            {/* DATE / TIME */}

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                required
                value={form.start_date}
                onChange={(e) =>
                  updateForm("start_date", e.target.value)
                }
              />

              <Input
                type="date"
                required
                value={form.end_date}
                onChange={(e) =>
                  updateForm("end_date", e.target.value)
                }
              />

              <Input
                type="time"
                value={form.start_time}
                onChange={(e) =>
                  updateForm("start_time", e.target.value)
                }
              />

              <Input
                type="time"
                value={form.end_time}
                onChange={(e) =>
                  updateForm("end_time", e.target.value)
                }
              />
            </div>

            <Input
              type="number"
              min="0"
              placeholder="Capacity"
              value={form.capacity}
              onChange={(e) =>
                updateForm("capacity", e.target.value)
              }
            />

            <Select
              value={form.status}
              onChange={(e) =>
                updateForm("status", e.target.value)
              }
            >
              <option value="draft">Draft</option>
              <option value="registration_open">
                Registration Open
              </option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>

            {/* ====================================================
               CARD DESIGN
            ==================================================== */}

            <div className="border-t pt-5">
              <div className="mb-3">
                <h3 className="font-semibold text-slate-800">
                  Participation Card Design
                </h3>

                <p className="text-xs text-slate-500">
                  Choose the background and logo that will be
                  used for participant cards.
                </p>
              </div>

              {/* BACKGROUND IMAGE */}

              <div className="rounded-2xl border bg-slate-50 p-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Background Image
                </label>

                {form.background_image ? (
                  <div className="relative overflow-hidden rounded-xl">
                    <img
                      src={form.background_image}
                      alt="Event background"
                      className="h-40 w-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeImage("background_image")
                      }
                      className="absolute right-2 top-2 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white transition hover:border-[#0B2A5B] hover:bg-slate-50">
                    <div className="text-3xl">🖼️</div>

                    <div className="mt-2 text-sm font-semibold text-slate-700">
                      Browse from device
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      PNG, JPG, JPEG or WEBP
                    </div>

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(e) =>
                        handleImageChange(
                          "background_image",
                          e.target.files?.[0]
                        )
                      }
                    />
                  </label>
                )}
              </div>

              {/* LOGO IMAGE */}

              <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Event / Organization Logo
                </label>

                {form.logo_image ? (
                  <div className="relative flex justify-center rounded-xl bg-white p-4">
                    <img
                      src={form.logo_image}
                      alt="Event logo"
                      className="h-32 w-32 object-contain"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeImage("logo_image")
                      }
                      className="absolute right-2 top-2 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white transition hover:border-[#0B2A5B] hover:bg-slate-50">
                    <div className="text-3xl">🏫</div>

                    <div className="mt-2 text-sm font-semibold text-slate-700">
                      Browse Logo from device
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      PNG, JPG, JPEG or WEBP
                    </div>

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(e) =>
                        handleImageChange(
                          "logo_image",
                          e.target.files?.[0]
                        )
                      }
                    />
                  </label>
                )}
              </div>
            </div>

            {/* SAVE */}

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-[#0B2A5B] text-white disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editing
                ? "Update Event"
                : "Save Event"}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}