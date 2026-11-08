import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Users, ClipboardList } from "lucide-react";
import api from "../api";
import { PageHeader, StatCard } from "../components/ui";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    participants: 0,
    events: 0,
    registrations: 0,
    checkins: 0,
  });
  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data));
  }, []);
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Monitor your events and attendance in one place."
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Participants"
          value={stats.participants}
          icon={Users}
        />
        <StatCard label="Events" value={stats.events} icon={CalendarDays} />
        <StatCard
          label="Registrations"
          value={stats.registrations}
          icon={ClipboardList}
        />
        <StatCard
          label="Check-ins"
          value={stats.checkins}
          icon={CheckCircle2}
        />
      </div>
      <div className="mt-6 bg-[#0B2A5B] rounded-3xl p-7 text-white overflow-hidden relative">
        <div className="relative z-10 max-w-xl">
          <p className="text-blue-200 text-sm font-semibold uppercase tracking-widest">
            QR Event Check-in
          </p>
          <h2 className="text-3xl font-bold mt-2">
            Fast, simple attendance marking.
          </h2>
          <p className="text-white/70 mt-3">
            Create an event, register participants, generate their QR cards, and
            scan them at the entrance.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-24 w-72 h-72 rounded-full border border-white/10" />
        <div className="absolute right-20 top-8 w-24 h-24 border border-white/10 rounded-2xl rotate-12" />
      </div>
    </>
  );
}
