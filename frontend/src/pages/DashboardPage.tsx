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


export default function DashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  
  // Administrative Core States
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [dbStatus, setDbStatus] = useState({ online: true, mode: 'Memory-Mapped Registry Store', provider: 'SQLite & In-Memory Fallbacks' });
  const [loading, setLoading] = useState(false);
  const [deptStats, setDeptStats] = useState<{ department: string; patientCount: number; approvedCount: number; pendingCount: number; emergencyCount: number }[]>([]);

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
      api.getDepartmentStats().then(setDeptStats).catch(() => {}),
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



  // ── Registered sessions = completed intake linked to a patient account ──
  // This is the single source of truth for ALL admin counts.
  // Anonymous / test sessions that were never saved to a patient account are excluded.
  const registeredSessions = (sessions as any[]).filter(
    (s) => s.phase === 'complete' && s.linkedPatientId
  );

  const criticalCount = registeredSessions.filter(
    (s) => s.triage?.urgency === 'emergency' || s.triage?.urgency === 'urgent'
  ).length;

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
              {registeredSessions.length}
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
              {criticalCount}
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
              {/* Stat Tiles — derived from registeredSessions (completed + linked to a patient account) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass bg-white p-5 border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Registered Intakes</span>
                    <span className="text-[10px] text-slate-500 font-semibold">Linked patient sessions</span>
                  </div>
                  <span className="text-sm font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl font-mono">{registeredSessions.length}</span>
                </div>

                <div className="glass bg-white p-5 border-l-4 border-l-red-500 border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Emergency Cases</span>
                    <span className="text-[10px] text-slate-500 font-semibold">High Priority Alert</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {criticalCount > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />}
                    <span className="text-sm font-black text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-xl font-mono">{criticalCount}</span>
                  </div>
                </div>

                <div className="glass bg-white p-5 border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Clinics Active</span>
                    <span className="text-[10px] text-slate-500 font-semibold">Departments Registered</span>
                  </div>
                  <span className="text-sm font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl font-mono">{departments.length}</span>
                </div>

                <div className="glass bg-white p-5 border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Active Doctors</span>
                    <span className="text-[10px] text-slate-500 font-semibold">Physicians Registered</span>
                  </div>
                  <span className="text-sm font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl font-mono">{doctors.length}</span>
                </div>
              </div>

              {/* Department Summary (Database Registry panel removed) */}
              <div className="grid grid-cols-1 gap-6">
                <div className="glass bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h4 className="font-display font-black text-slate-800 text-xs uppercase flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-650" /> Department Patient Distribution
                  </h4>
                  {deptStats.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-semibold">No registered patients routed to any department yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {deptStats.map((ds) => {
                        const maxCount = Math.max(...deptStats.map(d => d.patientCount), 1);
                        const pct = Math.round((ds.patientCount / maxCount) * 100);
                        return (
                          <div key={ds.department} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-black text-slate-800 uppercase">{ds.department}</span>
                              <span className="font-mono font-bold text-slate-500">{ds.patientCount} patient{ds.patientCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                              <div className={`h-2 rounded-full ${ds.emergencyCount > 0 ? 'bg-red-500' : 'bg-indigo-600'}`} style={{ width: `${pct}%` }}></div>
                            </div>
                            <div className="flex gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              <span className="text-green-600">{ds.approvedCount} approved</span>
                              <span className="text-amber-600">{ds.pendingCount} pending</span>
                              {ds.emergencyCount > 0 && <span className="text-red-600">{ds.emergencyCount} urgent</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                  <p className="text-xs text-slate-500 font-semibold mt-0.5 font-sans">AI Appointment Routing System — showing registered patients only.</p>
                </div>
              </div>

              {/* Only registered patients (linkedPatientId present) with completed intake */}
              <div className="space-y-4">
                {sessions.filter((s: any) => s.phase === 'complete' && s.linkedPatientId).length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm">No completed intake sessions from registered patients found.</div>
                )}
                {sessions.filter((s: any) => s.phase === 'complete' && s.linkedPatientId).map((s: any) => {
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

              {/* Department Cards - Dynamic from Database */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {departments.map((dept) => {
                  const stats = deptStats.find(d => d.department === dept);
                  const deptDoctors = doctors.filter((d: any) => d.department === dept);
                  const activeDoctors = deptDoctors.filter((d: any) => (d.availabilityStatus || 'available') === 'available' || (d.availabilityStatus || 'available') === 'in_consult');
                  const patientCount = stats?.patientCount || 0;
                  const hasEmergency = (stats?.emergencyCount || 0) > 0;
                  const loadPct = deptDoctors.length > 0 ? Math.min(Math.round((patientCount / Math.max(deptDoctors.length * 3, 1)) * 100), 100) : 0;

                  return (
                    <div key={dept} className="glass bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex justify-between items-center pb-2">
                        <h4 className="font-display font-black text-slate-900 text-sm uppercase">{dept}</h4>
                        <span className={`font-display font-black text-sm ${loadPct > 70 ? 'text-red-600' : 'text-indigo-650'}`}>{loadPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${loadPct > 70 ? 'bg-red-500' : 'bg-indigo-600'}`} style={{ width: `${loadPct}%` }}></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-slate-500">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Doctors</span>
                          <span className="text-slate-850 font-black">{activeDoctors.length}/{deptDoctors.length}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Patients</span>
                          <span className="text-slate-850 font-black">{patientCount}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Approved</span>
                          <span className="text-green-700 font-black">{stats?.approvedCount || 0}</span>
                        </div>
                      </div>
                      {hasEmergency && (
                        <div className="p-3 bg-red-50/50 border border-red-150 rounded-xl text-[10px] text-red-750 font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                          <span>{stats?.emergencyCount} URGENT CASE{(stats?.emergencyCount || 0) > 1 ? 'S' : ''} ACTIVE</span>
                        </div>
                      )}
                      {deptDoctors.length === 0 && (
                        <div className="p-3 bg-amber-50/50 border border-amber-150 rounded-xl text-[10px] text-amber-700 font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>NO DOCTORS ASSIGNED</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {departments.length === 0 && (
                  <div className="lg:col-span-2 text-center py-12 text-slate-400 text-sm font-semibold">No departments registered yet. Add one below.</div>
                )}
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
                    {doctors.map((doc: any) => {
                      const docDeptStats = deptStats.find(d => d.department === doc.department);
                      const patientCount = docDeptStats?.patientCount || 0;
                      const status = doc.availabilityStatus || 'available';
                      const statusConfig: Record<string, { label: string; cls: string }> = {
                        available: { label: 'AVAILABLE', cls: 'bg-green-50 text-green-700 border-green-200' },
                        in_consult: { label: 'IN CONSULT', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                        on_break: { label: 'ON BREAK', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                        off_duty: { label: 'OFF DUTY', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
                      };
                      const sc = statusConfig[status] || statusConfig.available;
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/50">
                          <td className="p-4 pl-6 font-black text-slate-900">{doc.name}</td>
                          <td className="p-4 text-slate-500 font-bold">{doc.department}</td>
                          <td className="p-4">
                            <span className={`text-[9px] font-black px-3 py-1 rounded border uppercase ${sc.cls}`}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-extrabold text-slate-800">
                            {patientCount}
                          </td>
                          <td className="p-4 pr-6">
                            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-850">
                              <span>User: <code className="bg-indigo-50 px-1 py-0.5 rounded text-indigo-755 font-mono select-all">{doc.username}</code></span>
                              <span>|</span>
                              <span>Pass: <code className="bg-indigo-50 px-1 py-0.5 rounded text-indigo-755 font-mono select-all">{doc.password}</code></span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
              <div className="border-b pb-4">
                <h3 className="font-display font-black text-slate-800 text-lg uppercase">AI TRIAGE MONITOR</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Real-time analysis of AI-handled intakes from database.</p>
              </div>

              {/* Urgency Distribution from real sessions */}
              <div className="glass bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-650" /> TRIAGE URGENCY DISTRIBUTION
                  </span>
                  <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded border uppercase">
                    {registeredSessions.length} REGISTERED INTAKES
                  </span>
                </div>
                {(() => {
                  const urgencyGroups: Record<string, number> = {};
                  registeredSessions.forEach((s: any) => {
                    const u = s.triage?.urgency || 'unknown';
                    urgencyGroups[u] = (urgencyGroups[u] || 0) + 1;
                  });
                  const total = registeredSessions.length || 1;
                  const urgencyColors: Record<string, string> = {
                    emergency: 'bg-red-500', urgent: 'bg-orange-500', high: 'bg-amber-500',
                    medium: 'bg-indigo-600', low: 'bg-green-500', unknown: 'bg-slate-400'
                  };
                  return (
                    <div className="space-y-3">
                      {Object.entries(urgencyGroups).sort(([,a],[,b]) => b - a).map(([urgency, count]) => (
                        <div key={urgency} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-black text-slate-800 uppercase">{urgency}</span>
                            <span className="font-mono font-bold text-slate-500">{count} ({Math.round((count / total) * 100)}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5">
                            <div className={`h-2.5 rounded-full ${urgencyColors[urgency] || 'bg-slate-400'}`} style={{ width: `${Math.round((count / total) * 100)}%` }}></div>
                          </div>
                        </div>
                      ))}
                      {Object.keys(urgencyGroups).length === 0 && (
                        <div className="py-12 text-center text-slate-400 text-xs font-semibold">No registered intake sessions to analyze yet.</div>
                      )}
                    </div>
                  );
                })()}
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
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Critical cases requiring immediate intervention — sourced from database.</p>
                </div>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                </span>
              </div>

              {/* Stat Boxes — sourced from registeredSessions only */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass bg-white p-5 border-2 border-red-500 rounded-3xl shadow-sm space-y-1">
                  <span className="text-[9px] font-black text-red-750 uppercase tracking-widest block">ACTIVE CRITICAL CASES</span>
                  <div className="text-3xl font-black text-red-650 font-display">{criticalCount}</div>
                </div>
                <div className="glass bg-white p-5 border border-slate-900 rounded-3xl shadow-sm space-y-1">
                  <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest block">PENDING APPROVAL</span>
                  <div className="text-3xl font-black text-slate-900 font-display">
                    {registeredSessions.filter((s: any) => s.approvalStatus === 'pending').length}
                  </div>
                </div>
                <div className="glass bg-white p-5 border border-slate-900 rounded-3xl shadow-sm space-y-1">
                  <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest block">TOTAL REGISTERED</span>
                  <div className="text-3xl font-black text-slate-900 font-display">{registeredSessions.length}</div>
                </div>
              </div>

              {/* Emergency/Urgent Sessions — registered patients only */}
              <div className="glass bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="bg-slate-900 px-6 py-3 border-b text-[10px] text-white font-black uppercase tracking-wider">
                  EMERGENCY &amp; URGENT SESSIONS — REGISTERED PATIENTS
                </div>
                <div className="divide-y divide-slate-100 font-semibold text-xs text-slate-700">
                  {registeredSessions.filter((s: any) => {
                    const urgency = s.triage?.urgency;
                    return urgency === 'emergency' || urgency === 'urgent' || urgency === 'high';
                  }).length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm font-semibold">No emergency or urgent cases from registered patients.</div>
                  )}
                  {registeredSessions.filter((s: any) => {
                    const urgency = s.triage?.urgency;
                    return urgency === 'emergency' || urgency === 'urgent' || urgency === 'high';
                  }).map((s: any) => {
                    const isEmergency = s.triage?.urgency === 'emergency';
                    return (
                      <div key={s.id} className={`p-5 pl-6 flex gap-4 ${isEmergency ? 'bg-red-50/50' : ''}`}>
                        <span className={`${isEmergency ? 'text-red-600' : 'text-slate-400'} font-mono font-extrabold shrink-0`}>
                          {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="space-y-1">
                          <div className={`font-black uppercase ${isEmergency ? 'text-red-850' : 'text-slate-850'}`}>
                            {s.profile?.name || 'Unknown'} — {s.triage?.urgency?.toUpperCase()} priority
                          </div>
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${isEmergency ? 'text-red-600' : 'text-slate-500'}`}>
                            {(s.symptoms?.symptoms || []).join(', ') || 'Symptoms pending'} • Dept: {s.triage?.department || 'Unassigned'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
