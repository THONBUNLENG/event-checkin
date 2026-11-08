import { useEffect, useState } from "react";
import api from "../api";
import { PageHeader, Select } from "../components/ui";

export default function AttendancePage() {
  const [events, setEvents] = useState([]),
    [eventId, setEventId] = useState(""),
    [rows, setRows] = useState([]);
  useEffect(() => {
    api.get("/events").then((r) => {
      setEvents(r.data);
      if (r.data[0]) setEventId(String(r.data[0].id));
    });
  }, []);
  useEffect(() => {
    if (eventId)
      api.get(`/events/${eventId}/checkins`).then((r) => setRows(r.data));
  }, [eventId]);
  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Review who has checked in to each event."
      />
      <div className="bg-white border rounded-2xl p-4 mb-5">
        <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">Select event</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="bg-white rounded-2xl border overflow-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-4">Participant</th>
              <th className="text-left p-4">Department</th>
              <th className="text-left p-4">Position</th>
              <th className="text-left p-4">Registration</th>
              <th className="text-left p-4">Checked In</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-4 font-semibold">{r.full_name}</td>
                <td className="p-4">{r.department_name || "—"}</td>
                <td className="p-4">{r.position_name || "—"}</td>
                <td className="p-4">{r.registration_code}</td>
                <td className="p-4 text-green-700 font-semibold">
                  {new Date(r.checked_in_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan="5" className="p-10 text-center text-slate-400">
                  No check-ins yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
