import { useState } from "react";
import { useAuth } from "../auth";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try { await login(email, password); navigate("/"); }
    catch (err) { setError(err.response?.data?.message || "Login failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071d40] to-[#1557A6] grid place-items-center p-5">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-3xl p-7 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-[#0B2A5B] text-white grid place-items-center text-xl font-bold mb-5">EC</div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="text-sm text-slate-500 mt-1 mb-7">Sign in to manage events and attendance.</p>
        {error && <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}
        <label className="text-sm font-semibold">Email</label>
        <input className="w-full border rounded-xl px-4 py-3 mt-2 mb-4" value={email} onChange={e=>setEmail(e.target.value)} />
        <label className="text-sm font-semibold">Password</label>
        <input type="password" className="w-full border rounded-xl px-4 py-3 mt-2 mb-6" value={password} onChange={e=>setPassword(e.target.value)} />
        <button disabled={busy} className="w-full bg-[#0B2A5B] text-white rounded-xl py-3 font-semibold hover:bg-[#1557A6] disabled:opacity-60">{busy ? "Signing in..." : "Sign in"}</button>
        <p className="text-xs text-slate-400 mt-5 text-center">Demo: admin@example.com / admin123</p>
      </form>
    </div>
  );
}
