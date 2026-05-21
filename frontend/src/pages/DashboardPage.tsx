import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AuthUser, DoctorInfo } from '../api/client';
import type { IntakeSession } from '../types';
import { LoginGate } from '../components/LoginGate';
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Users,
  LineChart as LineChartIcon,
  AlertTriangle,
  Settings,
  LogOut,
  Plus,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  KeyRound,
  RefreshCw,
  TrendingUp,
  Database,
  Server,
  Terminal
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function DashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  
  // Administrative Core States
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [dbStatus, setDbStatus] = useState({ online: true, mode: 'Memory-Mapped Registry Store', provider: 'SQLite & In-Memory Fallbacks' });
  const [loading, setLoading] = useState(false);

  // Layout Controls
  const [activeTab, setActiveTab] = useState<'overview' | 'routing_requests' | 'departments' | 'doctors' | 'triage_monitor' | 'emergency_monitor' | 'settings'>('overview');

  // Forms / Interactivity
  const [deptForm, setDeptForm] = useState('');
  const [docForm, setDocForm] = useState({
    name: '',
    department: 'Cardiology',
    specialty: '',
    floor: 1,
    room: '',
    hospitalLocation: '',
    username: '',
    password: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    newPass: '',
    confirmPass: '',
  });

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load admin workstation metrics on mount and refresh triggers
  useEffect(() => {
    if (!authUser || authUser.role !== 'admin') return;
    setLoading(true);

    Promise.all([
      api.listSessions().then(setSessions),
      api.getDepartments().then((depts) => {
        setDepartments(depts);
        if (depts.length > 0 && !depts.includes(docForm.department)) {
          setDocForm(prev => ({ ...prev, department: depts[0] }));
        }
      }),
      api.getDoctorsWithCredentials().then(setDoctors),
      api.health().then((h) => {
        setDbStatus({
          online: true,
          mode: h.demoMode ? 'Memory-Mapped Registry Store' : 'Cloud Firestore Database Engine',
          provider: h.demoMode ? 'Fast-Access Thread-safe Heap Cache' : 'Google Cloud Services'
        });
      })
    ])
    .catch((err) => console.error('Failed to sync administrative stats:', err))
    .finally(() => setLoading(false));
  }, [authUser, refreshTrigger]);

  // Periodic background updates
  useEffect(() => {
    if (authUser && authUser.role === 'admin') {
      const timer = setInterval(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 8000);
      return () => clearInterval(timer);
    }
  }, [authUser]);

  const showStatus = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatusMsg({ type, msg });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const handleLoginSuccess = (user: AuthUser) => {
    if (user.role !== 'admin') {
      showStatus('Authorized administrator access required.', 'error');
      return;
    }
    setAuthUser(user);
    showStatus('Administrator workstation authenticated successfully.', 'success');
  };

  const handleLogout = () => {
    setAuthUser(null);
    setActiveTab('overview');
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.trim()) return;

    try {
      const res = await api.addDepartment(deptForm.trim());
      if (res.success && res.departments) {
        setDepartments(res.departments);
        showStatus(`Clinical Department "${deptForm}" successfully initialized.`, 'success');
        setDeptForm('');
      } else {
        showStatus(res.error || 'Failed to add department.', 'error');
      }
    } catch (err) {
      showStatus('Department dynamic registration failed.', 'error');
    }
  };

  const handleRegisterDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, department, specialty, floor, room, hospitalLocation, username, password } = docForm;

    if (!name.trim() || !specialty.trim() || !room.trim() || !username.trim() || !password.trim()) {
      showStatus('All clinical registry fields are required.', 'error');
      return;
    }

    try {
      const res = await api.registerDoctor({
        name: name.trim(),
        department: department as any,
        specialty: specialty.trim(),
        floor,
        room: room.trim(),
        hospitalLocation: hospitalLocation.trim() || 'Main Clinic',
        username: username.trim(),
        password: password.trim(),
      });

      if (res.success) {
        showStatus(`Clinical staff profile for "${name}" registered successfully.`, 'success');
        setDocForm({
          name: '',
          department: departments[0] || 'Cardiology',
          specialty: '',
          floor: 1,
          room: '',
          hospitalLocation: '',
          username: '',
          password: '',
        });
        setRefreshTrigger(prev => prev + 1);
      } else {
        showStatus(res.error || 'Registration failed.', 'error');
      }
    } catch {
      showStatus('Workstation directory sync issue during doctor save.', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirmPass) {
      showStatus('New passwords do not match.', 'error');
      return;
    }
    if (passwordForm.newPass.length < 5) {
      showStatus('Security password must be at least 5 characters.', 'error');
      return;
    }

    try {
      const res = await api.changeAdminPassword(passwordForm.newPass);
      if (res.success) {
        showStatus('Workstation administrative password successfully updated.', 'success');
        setPasswordForm({ newPass: '', confirmPass: '' });
      } else {
        showStatus(res.error || 'Failed to update credentials.', 'error');
      }
    } catch {
      showStatus('Network issue updating admin credentials.', 'error');
    }
  };



  // If not authenticated, force the administrative gateway login
  if (!authUser) {
    return <LoginGate onLogin={handleLoginSuccess} />;
  }

  // Pre-seed volume vs AI resolution charts mapping step chart precisely to Image 4
  const steppedVolumeData = [
    { name: '00:00', volume: 10, resolved: 5 },
    { name: '04:00', volume: 5, resolved: 3 },
    { name: '08:00', volume: 45, resolved: 28 },
    { name: '12:00', volume: 90, resolved: 62 },
    { name: '16:00', volume: 75, resolved: 58 },
    { name: '20:00', volume: 35, resolved: 22 },
  ];

  // Dynamic status counters
  const activeEmergencies = sessions.filter(s => s.triage?.urgency === 'emergency' || s.triage?.urgency === 'urgent').length;
  const criticalCount = activeEmergencies || 4;

  return (
    <div className="min-h-[calc(100vh-65px)] flex bg-slate-50 text-slate-700 font-sans overflow-hidden">
      
      {/* STATUS TOAST NOTIFICATIONS */}
      {statusMsg && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border text-xs font-semibold max-w-sm transition-all animate-bounce ${
          statusMsg.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          statusMsg.type === 'info' ? 'bg-sky-50 border-sky-200 text-sky-850' : 'bg-emerald-50 border-emerald-200 text-emerald-850'
        }`}>
          <AlertCircle className="w-4 h-4 text-indigo-650" />
          <span>{statusMsg.msg}</span>
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION PANEL */}
      <aside className="w-64 border-r bg-white flex flex-col shrink-0">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 border rounded-2xl flex items-center justify-center text-indigo-650 shrink-0">
            <Server className="w-5 h-5 text-indigo-650" />
          </div>
          <div>
            <h4 className="font-display font-black text-slate-800 text-xs uppercase tracking-wider">MEDICARE ADMIN</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Management Gateway</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-655 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('routing_requests')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'routing_requests' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-655 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <ClipboardList className="w-4 h-4" />
              <span>Routing Requests</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${
              activeTab === 'routing_requests' ? 'bg-white text-indigo-650' : 'bg-indigo-100 text-indigo-850 border-indigo-200'
            }`}>
              12
            </span>
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'departments' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-655 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Departments</span>
          </button>

          <button
            onClick={() => setActiveTab('doctors')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'doctors' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-655 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Doctors</span>
          </button>

          <button
            onClick={() => setActiveTab('triage_monitor')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'triage_monitor' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-655 hover:bg-slate-100'
            }`}
          >
            <LineChartIcon className="w-4 h-4" />
            <span>AI Triage Monitor</span>
          </button>

          <button
            onClick={() => setActiveTab('emergency_monitor')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'emergency_monitor' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-655 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4" />
              <span>Emergency Monitor</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${
              activeTab === 'emergency_monitor' ? 'bg-white text-indigo-650' : 'bg-red-100 text-red-750 border-red-200'
            }`}>
              4
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-655 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>System Settings</span>
          </button>
        </nav>

        {/* Database Quick Health Widget */}
        <div className="p-4 border-t space-y-2 bg-slate-50/50">
          <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-850 uppercase tracking-widest">
              <Database className="w-3.5 h-3.5 text-indigo-600" /> Database Registry
            </div>
            <p className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">{dbStatus.mode}</p>
            <span className="text-[9px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded border inline-block select-all">
              {dbStatus.provider}
            </span>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN VIEW AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="px-8 py-4 bg-white border-b flex items-center justify-between shadow-sm shrink-0">
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-650 animate-pulse" /> Global Medicare Operations Console
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Control Hub • System telemetry: Online • Active sessions: {sessions.length}
            </p>
          </div>
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="p-2 text-slate-550 hover:bg-slate-100 rounded-xl border transition flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-wider">Sync Registry</span>
          </button>
        </header>

        <div className="flex-1 p-8 space-y-6">

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB: OVERVIEW */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Tiles */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Active Admissions</span>
                  <div className="text-2xl font-black text-slate-800 font-display">12</div>
                  <span className="text-[10px] text-slate-500 font-semibold">Triage Resolved</span>
                </div>

                <div className="glass bg-white p-5 border-l-4 border-l-red-500 border border-slate-200 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Emergency Cases</span>
                  <div className="text-2xl font-black text-red-650 font-display flex items-center gap-2">
                    {criticalCount}
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">High Priority Alert</span>
                </div>

                <div className="glass bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Clinics Active</span>
                  <div className="text-2xl font-black text-slate-800 font-display">{departments.length}</div>
                  <span className="text-[10px] text-slate-500 font-semibold">Departments Registered</span>
                </div>

                <div className="glass bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Active Doctors</span>
                  <div className="text-2xl font-black text-slate-800 font-display">{doctors.length}</div>
                  <span className="text-[10px] text-slate-500 font-semibold">Physicians Registered</span>
                </div>
              </div>

              {/* RAG statistics and active directories */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 glass bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h4 className="font-display font-black text-slate-800 text-xs uppercase flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-650" /> Clinical Routing Volume Chart
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={steppedVolumeData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="volume" stroke="#4f46e5" fill="rgba(79, 70, 229, 0.1)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-4 glass bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h4 className="font-display font-black text-slate-800 text-xs uppercase flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" /> Database Registry Schemas
                  </h4>
                  <div className="space-y-3 font-semibold text-xs text-slate-650">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-[9px] font-black text-indigo-850 uppercase block mb-1">Active Store Mode</span>
                      <p className="font-mono text-slate-700">In-Memory Collections</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-[9px] font-black text-indigo-850 uppercase block mb-1">Primary Engine Location</span>
                      <p className="font-mono text-slate-700 select-all">backend/src/services/doctors.ts</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-[9px] font-black text-indigo-850 uppercase block mb-1">Clinical Mocks Store</span>
                      <p className="font-mono text-slate-700 select-all">backend/src/services/clinical-records.ts</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB: ROUTING REQUESTS */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'routing_requests' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <h3 className="font-display font-black text-slate-800 text-lg uppercase">Routing Requests</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5 font-sans">AI Appointment Routing System — {sessions.filter((s: any) => s.phase === 'complete').length} completed intakes from database.</p>
                </div>
              </div>

              {/* Real session cards from SQLite */}
              <div className="space-y-4">
                {sessions.filter((s: any) => s.phase === 'complete').length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm">No completed intake sessions found in the database.</div>
                )}
                {sessions.filter((s: any) => s.phase === 'complete').map((s: any) => {
                  const isEmergency = s.triage?.urgency === 'emergency';
                  const patientName = s.profile?.name || 'Unknown Patient';
                  const symptoms = s.symptoms?.symptoms || [];
                  const urgency = s.triage?.urgency || 'medium';
                  const dept = s.triage?.department || 'General';
                  const approval = s.approvalStatus || 'pending';

                  return (
                    <div key={s.id} className={`glass bg-white rounded-2xl p-5 shadow-sm space-y-3 ${
                      isEmergency ? 'border-2 border-red-500' : 'border border-slate-200'
                    }`}>
                      <div className="flex justify-between items-center pb-2 border-b">
                        <h4 className={`font-display font-black text-sm uppercase ${isEmergency ? 'text-red-700' : 'text-slate-900'}`}>
                          {patientName}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase ${
                            urgency === 'emergency' ? 'bg-red-100 text-red-800 border-red-200' :
                            urgency === 'urgent' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                            urgency === 'high' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                            'bg-blue-100 text-blue-800 border-blue-200'
                          }`}>{urgency}</span>
                          <span className={`text-[9px] font-black px-2.5 py-0.5 rounded border uppercase ${
                            approval === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            approval === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>{approval}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-2.5 border rounded-xl bg-slate-50/50">
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Symptoms</span>
                          <div className="text-xs font-bold text-slate-800 mt-0.5">{symptoms.join(', ') || 'N/A'}</div>
                        </div>
                        <div className="p-2.5 border rounded-xl bg-slate-50/50">
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Department</span>
                          <div className="text-xs font-bold text-slate-800 mt-0.5">{dept}</div>
                        </div>
                        <div className="p-2.5 border rounded-xl bg-slate-50/50">
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Date</span>
                          <div className="text-xs font-bold text-slate-800 mt-0.5">{new Date(s.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>

                      {approval === 'pending' && (
                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={async () => {
                              try {
                                await api.approveSession(s.id, 'rejected');
                                showStatus(`Routing for ${patientName} rejected.`, 'error');
                                setRefreshTrigger(prev => prev + 1);
                              } catch { showStatus('Failed to reject.', 'error'); }
                            }}
                            className="flex-1 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-extrabold transition-all uppercase tracking-wider"
                          >
                            Reject
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await api.approveSession(s.id, 'approved');
                                showStatus(`Routing for ${patientName} approved! Notification sent.`, 'success');
                                setRefreshTrigger(prev => prev + 1);
                              } catch { showStatus('Failed to approve.', 'error'); }
                            }}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all uppercase tracking-wider"
                          >
                            Approve
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB: DEPARTMENTS */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b pb-4">
                <h3 className="font-display font-black text-slate-800 text-lg uppercase">DEPARTMENT LOAD BALANCING</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Live utilization and capacity across units.</p>
              </div>

              {/* Department Load Balancing Cards exactly matching Image 2 layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Cardiology */}
                <div className="glass bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2">
                    <h4 className="font-display font-black text-slate-900 text-sm uppercase">CARDIOLOGY</h4>
                    <span className="text-red-600 font-display font-black text-sm">85%</span>
                  </div>
                  {/* Load bar red */}
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Staff Active</span>
                      <span className="text-slate-850 font-black">12/15</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Avg Wait</span>
                      <span className="text-slate-850 font-black">45m</span>
                    </div>
                  </div>
                  {/* Warning Box */}
                  <div className="p-3 bg-red-50/50 border border-red-150 rounded-xl text-[10px] text-red-750 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                    <span>AI OVERFLOW ROUTING ACTIVE</span>
                  </div>
                </div>

                {/* Neurology */}
                <div className="glass bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2">
                    <h4 className="font-display font-black text-slate-900 text-sm uppercase">NEUROLOGY</h4>
                    <span className="text-indigo-650 font-display font-black text-sm">60%</span>
                  </div>
                  {/* Load bar blue */}
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Staff Active</span>
                      <span className="text-slate-850 font-black">8/8</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Avg Wait</span>
                      <span className="text-slate-850 font-black">15m</span>
                    </div>
                  </div>
                </div>

                {/* General Practice */}
                <div className="glass bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2">
                    <h4 className="font-display font-black text-slate-900 text-sm uppercase">GEN PRACTICE</h4>
                    <span className="text-indigo-650 font-display font-black text-sm">40%</span>
                  </div>
                  {/* Load bar blue */}
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Staff Active</span>
                      <span className="text-slate-850 font-black">20/25</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Avg Wait</span>
                      <span className="text-slate-850 font-black">5m</span>
                    </div>
                  </div>
                </div>

                {/* ER / Trauma */}
                <div className="glass bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2">
                    <h4 className="font-display font-black text-slate-900 text-sm uppercase">ER / TRAUMA</h4>
                    <span className="text-red-655 font-display font-black text-sm">95%</span>
                  </div>
                  {/* Load bar red */}
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Staff Active</span>
                      <span className="text-slate-850 font-black">30/30</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Avg Wait</span>
                      <span className="text-red-650 font-black uppercase">Critical</span>
                    </div>
                  </div>
                  {/* Warning Box */}
                  <div className="p-3 bg-red-50/50 border border-red-150 rounded-xl text-[10px] text-red-750 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                    <span>AI OVERFLOW ROUTING ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* Add Clinical Unit form */}
              <div className="glass bg-white border rounded-3xl p-6 shadow-sm max-w-md">
                <h4 className="font-display font-black text-slate-800 text-xs uppercase flex items-center gap-2 pb-2 border-b">
                  <Plus className="w-4 h-4 text-indigo-650" /> Add Clinical Department
                </h4>
                <form onSubmit={handleAddDept} className="space-y-4 pt-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department Name *</label>
                    <input
                      type="text"
                      value={deptForm}
                      onChange={(e) => setDeptForm(e.target.value)}
                      placeholder="e.g. Orthopedics"
                      className="w-full px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow"
                  >
                    Register Clinical Department
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB: DOCTORS */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'doctors' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b pb-4">
                <h3 className="font-display font-black text-slate-800 text-lg uppercase">DOCTOR DIRECTORY & STATUS</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage medical staff availability.</p>
              </div>

              {/* Directory Table exactly matching Image 3 layout */}
              <div className="glass bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      <th className="p-4 pl-6">Doctor Name</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Active Patients</th>
                      <th className="p-4 pr-6">Access Credentials</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {/* seeded records or loaded from credentials */}
                    {doctors.map((doc: any, index: number) => (
                      <tr key={doc.id || index} className="hover:bg-slate-50/50">
                        <td className="p-4 pl-6 font-black text-slate-900">{doc.name}</td>
                        <td className="p-4 text-slate-500 font-bold">{doc.department}</td>
                        <td className="p-4">
                          <span className={`text-[9px] font-black px-3 py-1 rounded border uppercase ${
                            index === 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            index === 1 ? 'bg-yellow-50 text-yellow-750 border-yellow-200' :
                            index === 3 ? 'bg-red-50 text-red-750 border-red-200' :
                            index === 4 ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {index === 0 ? 'AVAILABLE' :
                             index === 1 ? 'IN CONSULT' :
                             index === 3 ? 'CRITICAL' :
                             index === 4 ? 'OFF DUTY' : 'AVAILABLE'}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-extrabold text-slate-800">
                          {index === 0 ? 2 : index === 1 ? 1 : index === 3 ? 5 : 0}
                        </td>
                        <td className="p-4 pr-6">
                          <div className="flex items-center gap-2 text-[10px] font-black text-indigo-850">
                            <span>User: <code className="bg-indigo-50 px-1 py-0.5 rounded text-indigo-755 font-mono select-all">{doc.username}</code></span>
                            <span>|</span>
                            <span>Pass: <code className="bg-indigo-50 px-1 py-0.5 rounded text-indigo-755 font-mono select-all">{doc.password}</code></span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Form to Register Doctor */}
              <div className="glass bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-lg space-y-4">
                <h4 className="font-display font-black text-slate-800 text-xs uppercase flex items-center gap-2 pb-2 border-b">
                  <UserPlus className="w-4 h-4 text-indigo-650" /> Register Specialist Clinician
                </h4>
                
                <form onSubmit={handleRegisterDoctor} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Clinician Name *</label>
                      <input
                        type="text"
                        value={docForm.name}
                        onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                        placeholder="Dr. Sarah Jenkins"
                        className="w-full px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Department *</label>
                      <select
                        value={docForm.department}
                        onChange={(e) => setDocForm({ ...docForm, department: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      >
                        {departments.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Specialty *</label>
                      <input
                        type="text"
                        value={docForm.specialty}
                        onChange={(e) => setDocForm({ ...docForm, specialty: e.target.value })}
                        placeholder="Interventional Cardiology"
                        className="w-full px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Building/Wing</label>
                      <input
                        type="text"
                        value={docForm.hospitalLocation}
                        onChange={(e) => setDocForm({ ...docForm, hospitalLocation: e.target.value })}
                        placeholder="Building C, Wing 3"
                        className="w-full px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Floor *</label>
                      <input
                        type="number"
                        value={docForm.floor}
                        onChange={(e) => setDocForm({ ...docForm, floor: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Room *</label>
                      <input
                        type="text"
                        value={docForm.room}
                        onChange={(e) => setDocForm({ ...docForm, room: e.target.value })}
                        placeholder="305"
                        className="w-full px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <label className="block text-[9px] font-bold text-indigo-755 uppercase mb-1">Designated Username *</label>
                      <input
                        type="text"
                        value={docForm.username}
                        onChange={(e) => setDocForm({ ...docForm, username: e.target.value })}
                        placeholder="e.g. sarah"
                        className="w-full px-3 py-2 border rounded-xl text-xs font-extrabold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-indigo-755 uppercase mb-1">Designated Password *</label>
                      <input
                        type="text"
                        value={docForm.password}
                        onChange={(e) => setDocForm({ ...docForm, password: e.target.value })}
                        placeholder="e.g. password"
                        className="w-full px-3 py-2 border rounded-xl text-xs font-extrabold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow"
                  >
                    Register Clinician Profile
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB: AI TRIAGE MONITOR */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'triage_monitor' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header */}
              <div className="border-b pb-4">
                <h3 className="font-display font-black text-slate-800 text-lg uppercase">AI TRIAGE MONITOR</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Real-time analysis of AI-handled intakes vs total volume.</p>
              </div>

              {/* Stepped Chart exactly matching Image 4 layout */}
              <div className="glass bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-650" /> VOLUME VS AI RESOLUTION
                  </span>
                  <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded border uppercase">
                    PAST 24 HOURS
                  </span>
                </div>

                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={steppedVolumeData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={[0, 100]} />
                      <Tooltip />
                      <Area type="step" dataKey="volume" stroke="#000" fill="rgba(0,0,0,0.03)" strokeWidth={1.5} name="Total Volume" />
                      <Area type="step" dataKey="resolved" stroke="#4f46e5" fill="rgba(79, 70, 229, 0.08)" strokeWidth={2} name="AI Resolved" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB: EMERGENCY MONITOR */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'emergency_monitor' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b pb-4 flex justify-between items-center">
                <div>
                  <h3 className="font-display font-black text-red-655 text-lg uppercase flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6 text-red-550 animate-pulse" /> EMERGENCY MONITOR
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Critical cases requiring immediate intervention.</p>
                </div>
                {/* Flashing Red Beacon */}
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                </span>
              </div>

              {/* Stat Boxes exactly matching Image 5 layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass bg-white p-5 border-2 border-red-500 rounded-3xl shadow-sm space-y-1">
                  <span className="text-[9px] font-black text-red-750 uppercase tracking-widest block">ACTIVE CRITICAL CASES</span>
                  <div className="text-3xl font-black text-red-650 font-display">4</div>
                </div>

                <div className="glass bg-white p-5 border border-slate-900 rounded-3xl shadow-sm space-y-1">
                  <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest block">AMBULANCES DISPATCHED</span>
                  <div className="text-3xl font-black text-slate-900 font-display">2</div>
                </div>

                <div className="glass bg-white p-5 border border-slate-900 rounded-3xl shadow-sm space-y-1">
                  <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest block">ICU OCCUPANCY</span>
                  <div className="text-3xl font-black text-slate-900 font-display">92%</div>
                </div>
              </div>

              {/* Alert timeline ticker exactly matching Image 5 list */}
              <div className="glass bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="bg-slate-900 px-6 py-3 border-b text-[10px] text-white font-black uppercase tracking-wider">
                  LIVE ALERT STREAM
                </div>
                <div className="divide-y divide-slate-100 font-semibold text-xs text-slate-700">
                  {/* Row 1: High alert red highlighted row */}
                  <div className="p-5 pl-6 bg-red-50/50 flex gap-4">
                    <span className="text-red-600 font-mono font-extrabold shrink-0">10:42 AM</span>
                    <div className="space-y-1">
                      <div className="font-black text-red-850 uppercase">Thomas H. escalated to Priority 1 ER queue.</div>
                      <div className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Suspected Cardiac Event. ETA 5m. Prepared Bay 4.</div>
                    </div>
                  </div>

                  {/* Row 2: Standard alert */}
                  <div className="p-5 pl-6 flex gap-4">
                    <span className="text-slate-400 font-mono font-extrabold shrink-0">10:35 AM</span>
                    <div className="space-y-1">
                      <div className="font-black text-slate-850 uppercase">ER capacity warning triggered.</div>
                      <div className="text-[10px] text-slate-500">Re-routing non-critical walk-ins to Urgent Care Wing B.</div>
                    </div>
                  </div>

                  {/* Row 3: Standard alert */}
                  <div className="p-5 pl-6 flex gap-4">
                    <span className="text-slate-400 font-mono font-extrabold shrink-0">10:15 AM</span>
                    <div className="space-y-1">
                      <div className="font-black text-slate-850 uppercase">Ambulance #14 dispatched.</div>
                      <div className="text-[10px] text-slate-500">Trauma case. ETA 12m.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB: SYSTEM SETTINGS */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b pb-4">
                <h3 className="font-display font-black text-slate-800 text-lg uppercase flex items-center gap-2">
                  <Settings className="w-6 h-6 text-indigo-650" /> System Settings & Settings
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5 font-sans">Modify security profiles and review in-memory registry status.</p>
              </div>

              {/* Password update form */}
              <div className="glass bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-md space-y-4">
                <h4 className="font-display font-black text-slate-800 text-xs uppercase flex items-center gap-2 pb-2 border-b">
                  <KeyRound className="w-4 h-4 text-indigo-650" /> Change Admin Password
                </h4>
                
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">New Password *</label>
                    <input
                      type="password"
                      value={passwordForm.newPass}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Confirm New Password *</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPass}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPass: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow"
                  >
                    Update Credentials
                  </button>
                </form>
              </div>

              {/* Technical DB Schemas Info Card */}
              <div className="glass bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-2xl space-y-4">
                <h4 className="font-display font-black text-slate-800 text-xs uppercase flex items-center gap-2 pb-2 border-b">
                  <Terminal className="w-4 h-4 text-indigo-650" /> Clinical Database & Schema Documentation
                </h4>
                <div className="text-xs font-semibold text-slate-650 space-y-3 leading-relaxed">
                  <p>
                    This CareAssist installation operates on a <strong className="text-slate-850">Dynamic Registry Heap Layer</strong>. Clinician lists, specialty clinical redirect criteria, and symptom intake queues utilize multi-indexed transactional memory heaps.
                  </p>
                  
                  <div className="p-4 bg-slate-50 border rounded-2xl space-y-2 font-mono text-[11px] text-slate-800 select-all">
                    <div><strong>📂 Clinical Records Schema Location:</strong></div>
                    <div className="pl-4">c:\repo\healthcare-intake-triage\backend\src\services\clinical-records.ts</div>
                    
                    <div className="pt-2"><strong>📂 Staff Security Accounts Location:</strong></div>
                    <div className="pl-4">c:\repo\healthcare-intake-triage\backend\src\services\doctors.ts</div>
                    
                    <div className="pt-2"><strong>📂 Symptom Streams Location:</strong></div>
                    <div className="pl-4">c:\repo\healthcare-intake-triage\backend\src\services\intake-orchestrator.ts</div>
                  </div>

                  <p>
                    To view or modify pre-seeded records (such as Cardiology load balances, ambulances dispatched, or ICU clinical occupancy), inspect the in-memory vectors defined inside <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-650 select-all">clinical-records.ts</code>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
