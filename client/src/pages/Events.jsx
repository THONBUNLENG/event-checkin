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
};

export default function EventsPage() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load events
  const load = useCallback(async () => {
    try {
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
  // Do not make useEffect itself async.
  useEffect(() => {
    load();
  }, [load]);

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
      });
    } else {
      setForm({ ...empty });
    }

    setOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setOpen(false);
    setEditing(null);
    setForm({ ...empty });
  }

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

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
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

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex min-h-[250px] items-center justify-center">
          <div className="text-sm text-slate-500">
            Loading events...
          </div>
        </div>
      ) : rows.length === 0 ? (
        /* Empty state */
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
        /* Events */
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border bg-white p-5 shadow-sm"
            >
              <div className="flex justify-between gap-3">
                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
                  {row.status}
                </span>

                <span className="text-xs text-slate-400">
                  {row.event_code}
                </span>
              </div>

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
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {open && (
        <Modal
          title={editing ? "Edit Event" : "Create Event"}
          onClose={closeModal}
        >
          <form
            onSubmit={save}
            className="max-h-[75vh] space-y-3 overflow-y-auto pr-1"
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