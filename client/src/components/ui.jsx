export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div><h1 className="text-2xl font-bold text-slate-900">{title}</h1>{subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}</div>
      {action}
    </div>
  );
}

export function Button({ children, className="", ...props }) {
  return <button {...props} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${className}`}>{children}</button>;
}

export function Input({ className="", ...props }) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 ${className}`} />;
}

export function Select({ className="", children, ...props }) {
  return <select {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 ${className}`}>{children}</select>;
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 grid place-items-center overflow-auto">
      <div className="bg-white w-full max-w-[500px] rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b flex justify-between items-center"><h2 className="font-bold">{title}</h2><button onClick={onClose}>✕</button></div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon }) {
  return <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-slate-400">{label}</p><p className="text-3xl font-bold mt-2">{value}</p></div><div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 grid place-items-center"><Icon size={21}/></div></div></div>;
}
