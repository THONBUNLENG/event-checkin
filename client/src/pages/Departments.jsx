import { useCallback, useEffect, useState } from "react";

import api from "../api";
import { Button, Input, Modal, PageHeader } from "../components/ui";

const emptyForm = {
  name: "",
  description: "",
  status: "active",
};

export default function DepartmentsPage() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load departments
  const load = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/departments");

      setRows(response.data || []);
    } catch (err) {
      console.error("Failed to load departments:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load departments. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // IMPORTANT:
  // useEffect itself is NOT async.
  useEffect(() => {
    load();
  }, [load]);

  function start(row = null) {
    setEditing(row);

    if (row) {
      setForm({
        name: row.name || "",
        description: row.description || "",
        status: row.status || "active",
      });
    } else {
      setForm({ ...emptyForm });
    }

    setOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setOpen(false);
    setEditing(null);
    setForm({ ...emptyForm });
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

      if (editing) {
        await api.put(`/departments/${editing.id}`, form);
      } else {
        await api.post("/departments", form);
      }

      closeModal();

      await load();
    } catch (err) {
      console.error("Failed to save department:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to save department. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function del(id) {
    if (!window.confirm("Delete this department?")) {
      return;
    }

    try {
      setError("");

      await api.delete(`/departments/${id}`);

      await load();
    } catch (err) {
      console.error("Failed to delete department:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to delete department. Please try again."
      );
    }
  }

  return (
    <>
      <PageHeader
        title="Departments"
        subtitle="Manage your organization departments."
        action={
          <Button
            onClick={() => start()}
            className="bg-[#0B2A5B] text-white"
          >
            + Add Department
          </Button>
        }
      />

      {/* Error Message */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex min-h-[250px] items-center justify-center">
          <div className="text-sm text-slate-500">
            Loading departments...
          </div>
        </div>
      ) : rows.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center">
          <h3 className="text-lg font-semibold text-slate-700">
            No departments found
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Create your first department to get started.
          </p>

          <Button
            onClick={() => start()}
            className="mt-5 bg-[#0B2A5B] text-white"
          >
            + Add Department
          </Button>
        </div>
      ) : (
        /* Department Table */
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4 text-left font-semibold">
                    Name
                  </th>

                  <th className="p-4 text-left font-semibold">
                    Description
                  </th>

                  <th className="p-4 text-left font-semibold">
                    Status
                  </th>

                  <th className="p-4 text-right font-semibold">
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
                    <td className="p-4 font-semibold text-slate-800">
                      {row.name}
                    </td>

                    <td className="max-w-md p-4 text-slate-500">
                      {row.description || "No description"}
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          row.status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {row.status || "active"}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-3">
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

      {/* Add / Edit Modal */}
      {open && (
        <Modal
          title={
            editing ? "Edit Department" : "Add Department"
          }
          onClose={closeModal}
        >
          <form
            onSubmit={save}
            className="space-y-4"
          >
            <Input
              placeholder="Department name"
              required
              value={form.name}
              onChange={(e) =>
                updateForm("name", e.target.value)
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

            <select
              className="w-full rounded-xl border bg-white p-3 outline-none focus:ring-2 focus:ring-blue-100"
              value={form.status}
              onChange={(e) =>
                updateForm("status", e.target.value)
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-[#0B2A5B] text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editing
                ? "Update Department"
                : "Save Department"}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}