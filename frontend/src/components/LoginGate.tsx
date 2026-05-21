import { useState } from 'react';
import { Lock, User, ShieldCheck, Stethoscope, Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { AuthUser } from '../api/client';
import { api } from '../api/client';

interface LoginGateProps {
  onLogin: (user: AuthUser) => void;
}

export function LoginGate({ onLogin }: LoginGateProps) {
  const [tab, setTab] = useState<'doctor' | 'admin'>('doctor');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.login(username.trim(), password.trim());
      if (res.success && res.user) {
        if (tab === 'admin' && res.user.role !== 'admin') {
          setError('This account does not have administrator privileges');
          return;
        }
        onLogin(res.user);
      }
    } catch (err) {
      setError((err as Error).message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const quickLogins = [
    { label: 'Dr. Sarah Jenkins', sub: 'Cardiology', user: 'sarah', pass: 'password' },
    { label: 'Dr. John Carter', sub: 'Emergency', user: 'john', pass: 'password' },
    { label: 'Dr. Robert Chen', sub: 'General Med', user: 'robert', pass: 'password' },
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">CareAssist Clinical Portal</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Secure access for authorized personnel only</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => { setTab('doctor'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === 'doctor' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Stethoscope className="w-4 h-4" /> Doctor Login
          </button>
          <button
            type="button"
            onClick={() => { setTab('admin'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === 'admin' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Admin Login
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 shadow-lg border border-slate-200/80 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={tab === 'admin' ? 'admin' : 'e.g. sarah'}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-semibold"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-semibold"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all shadow-md shadow-indigo-200"
          >
            {loading ? 'Authenticating...' : tab === 'admin' ? 'Access Admin Console' : 'Access Clinical Workspace'}
          </button>
        </form>

        {/* Quick login helpers for demo */}
        {tab === 'doctor' && (
          <div className="mt-5 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Quick Demo Login</p>
            <div className="flex gap-2">
              {quickLogins.map((q) => (
                <button
                  key={q.user}
                  type="button"
                  onClick={() => { setUsername(q.user); setPassword(q.pass); }}
                  className="flex-1 text-[10px] font-bold text-slate-500 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg py-2 px-1 transition-all text-center"
                >
                  <div className="font-black text-slate-700">{q.label.replace('Dr. ', '')}</div>
                  <div className="text-slate-400">{q.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'admin' && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => { setUsername('admin'); setPassword('admin123'); }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg py-2 px-4 transition-all"
            >
              Fill Admin Demo Credentials
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
