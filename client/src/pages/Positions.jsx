import { useCallback, useEffect, useState } from "react";

import api from "../api";
import {
  Button,
  Input,
  Modal,
  PageHeader,
  Select,
} from "../components/ui";

const emptyForm = {
  department_id: "",
  name: "",
  description: "",
  status: "active",
};

export default function PositionsPage() {
  const [rows, setRows] = useState([]);
  const [deps, setDeps] = useState([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load positions and departments
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [positionsResponse, departmentsResponse] =
        await Promise.all([
          api.get("/positions"),
          api.get("/departments"),
        ]);

      setRows(positionsResponse.data || []);
      setDeps(departmentsResponse.data || []);
    } catch (err) {
      console.error("Failed to load positions:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load positions. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Do not make useEffect async
  useEffect(() => {
    load();
  }, [load]);

  function start(row = null) {
    setEditing(row);

    if (row) {
      setForm({
        department_id: row.department_id ?? "",
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

      const payload = {
        ...form,
        department_id: form.department_id
          ? Number(form.department_id)
          : null,
      };

      if (editing) {
        await api.put(`/positions/${editing.id}`, payload);
      } else {
        await api.post("/positions", payload);
      }

      closeModal();

      await load();
    } catch (err) {
      console.error("Failed to save position:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to save position. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function del(id) {
    if (!window.confirm("Delete this position?")) {
      return;
    }

    try {
      setError("");

      await api.delete(`/positions/${id}`);

      await load();
    } catch (err) {
      console.error("Failed to delete position:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to delete position. Please try again."
      );
    }
  }

  function getDepartmentName(departmentId) {
    const department = deps.find(
      (department) =>
        String(department.id) === String(departmentId)
    );

    return department?.name || "-";
  }

  return (
    <>
      <PageHeader
        title="Positions"
        subtitle="Manage roles and positions."
        action={
          <Button
            onClick={() => start()}
            className="bg-[#0B2A5B] text-white"
          >
            + Add Position
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
            Loading positions...
          </div>
        </div>
      ) : rows.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center">
          <h3 className="text-lg font-semibold text-slate-700">
            No positions found
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Create your first position to get started.
          </p>

          <Button
            onClick={() => start()}
            className="mt-5 bg-[#0B2A5B] text-white"
          >
            + Add Position
          </Button>
        </div>
      ) : (
        /* Position Table */
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4 text-left font-semibold">
                    Position
                  </th>

                  <th className="p-4 text-left font-semibold">
                    Department
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

                    <td className="p-4 text-slate-500">
                      {getDepartmentName(row.department_id)}
                    </td>

                    <td className="max-w-sm p-4 text-slate-500">
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
            editing ? "Edit Position" : "Add Position"
          }
          onClose={closeModal}
        >
          <form
            onSubmit={save}
            className="space-y-4"
          >
            <Input
              placeholder="Position name"
              required
              value={form.name}
              onChange={(e) =>
                updateForm("name", e.target.value)
              }
            />

            <Select
              value={form.department_id}
              onChange={(e) =>
                updateForm(
                  "department_id",
                  e.target.value
                )
              }
            >
              <option value="">No department</option>

              {deps.map((department) => (
                <option
                  key={department.id}
                  value={department.id}
                >
                  {department.name}
                </option>
              ))}
            </Select>

            <textarea
              className="w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Description"
              rows={4}
              value={form.description}
              onChange={(e) =>
                updateForm(
                  "description",
                  e.target.value
                )
              }
            />

            <Select
              value={form.status}
              onChange={(e) =>
                updateForm("status", e.target.value)
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-[#0B2A5B] text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editing
                ? "Update Position"
                : "Save Position"}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}