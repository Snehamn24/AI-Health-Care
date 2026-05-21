import { useState, useEffect } from 'react';
import { UserPlus, CheckCircle2, AlertCircle, Users, LogOut, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import type { AuthUser, DoctorInfo } from '../api/client';

const DEPARTMENTS = [
  'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics',
  'Pulmonology', 'Dermatology', 'ENT', 'Psychiatry', 'Emergency Care',
];

interface AdminConsoleProps {
  user: AuthUser;
  onLogout: () => void;
}

export function AdminConsole({ user, onLogout }: AdminConsoleProps) {
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [form, setForm] = useState({
    name: '', department: 'General Medicine', specialty: '',
    floor: 1, room: '', hospitalLocation: '', username: '', password: '',
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getDoctors().then(setDoctors).catch(() => {});
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.specialty || !form.username || !form.password) {
      setStatus({ type: 'error', msg: 'Please fill all required fields' });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await api.registerDoctor({
        name: form.name.startsWith('Dr.') ? form.name : `Dr. ${form.name}`,
        department: form.department,
        specialty: form.specialty,
        floor: form.floor,
        room: form.room || 'TBD',
        hospitalLocation: form.hospitalLocation || 'Main Building',
        username: form.username,
        password: form.password,
      });
      if (res.success && res.doctor) {
        setStatus({ type: 'success', msg: `${res.doctor.name} registered successfully! They can now log in.` });
        setDoctors((prev) => [...prev, res.doctor!]);
        setForm({ name: '', department: 'General Medicine', specialty: '', floor: 1, room: '', hospitalLocation: '', username: '', password: '' });
      } else {
        setStatus({ type: 'error', msg: res.error || 'Registration failed' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-0 shadow-xl flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-300" />
            <h1 className="text-xl font-black tracking-tight">Hospital Administration Console</h1>
          </div>
          <p className="text-xs text-indigo-200 mt-1 font-semibold">Signed in as {user.name}</p>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg border border-white/15 transition-all">
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Registration Form */}
        <div className="glass rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <h2 className="font-black text-slate-800 flex items-center gap-2 mb-5">
            <UserPlus className="w-5 h-5 text-indigo-600" /> Register New Doctor
          </h2>

          {status && (
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold mb-4 ${
              status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
            }`}>
              {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {status.msg}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Jane Smith"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department *</label>
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white">
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Specialty *</label>
              <input type="text" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="e.g. Interventional Cardiology"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Floor</label>
                <input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: parseInt(e.target.value) || 1 })} min={1} max={10}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Room</label>
                <input type="text" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="305"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Building</label>
                <input type="text" value={form.hospitalLocation} onChange={(e) => setForm({ ...form, hospitalLocation: e.target.value })} placeholder="Building A"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
            </div>

            <hr className="border-slate-100 my-2" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Login Credentials</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Username *</label>
                <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="janesmith"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password *</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
            </div>

            <button type="submit" disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all shadow-md shadow-indigo-200 mt-2">
              {submitting ? 'Registering...' : 'Register Doctor'}
            </button>
          </form>
        </div>

        {/* Registered Staff List */}
        <div className="glass rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <h2 className="font-black text-slate-800 flex items-center gap-2 mb-5">
            <Users className="w-5 h-5 text-indigo-600" /> Registered Clinical Staff ({doctors.length})
          </h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {doctors.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-indigo-50/30 transition-all">
                <div>
                  <div className="text-sm font-bold text-slate-800">{doc.name}</div>
                  <div className="text-[10px] text-slate-500 font-semibold">{doc.specialty}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{doc.department}</span>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">Floor {doc.floor}, Room {doc.room}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
