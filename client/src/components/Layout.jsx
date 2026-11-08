import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  BriefcaseBusiness,
  Building2,
  ScanLine,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../auth";

const links = [
  ["Dashboard", "/", LayoutDashboard],
  ["Events", "/events", CalendarDays],
  ["Participants", "/participants", Users],
  ["Departments", "/departments", Building2],
  ["Positions", "/positions", BriefcaseBusiness],
  ["Check-in", "/checkin", ScanLine],
  ["Attendance", "/attendance", ClipboardList],
];

export default function LayoutPage() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0B2A5B] text-white transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-white/10">
          {/* <div className="font-bold tracking-wide">EVENT CHECK-IN</div> */}
          <img src="/images/WeEventLogo.png" alt="Logo" className=" h-10 " />
          <button className="md:hidden" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {links.map(([label, to, Icon]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${isActive ? "bg-white/15 font-semibold" : "text-white/75 hover:bg-white/10 hover:text-white"}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-3 text-sm text-white/80 hover:text-white"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <div className="md:ml-64">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
          <button className="md:hidden" onClick={() => setOpen(true)}>
            <Menu />
          </button>
          <div className="hidden md:block text-sm text-slate-500">
            Smart Event Management & QR Attendance Check-in Platform.
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-[#0B2A5B] grid place-items-center font-bold">
              {user?.name?.slice(0, 1)?.toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold">{user?.name}</div>
              <div className="text-xs text-slate-500">Administrator</div>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
