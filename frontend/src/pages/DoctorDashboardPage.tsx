import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AuthUser, DoctorInfo } from '../api/client';
import type { IntakeSession } from '../types';
import { LoginGate } from '../components/LoginGate';
import {
  User,
  Stethoscope,
  Building,
  AlertOctagon,
  LogOut,
  ChevronRight,
  UserCheck,
  Bell,
  Search,
  Sparkles,
  PlusCircle,
  Edit3,
  X,
  RefreshCw,
  Calendar as CalendarIcon,
  ClipboardList,
  AlertCircle,
  ShieldCheck,
  Settings as SettingsIcon,
  Activity,
  Play,
  HeartCrack,
  Clock,
  Sliders,
  BrainCircuit
} from 'lucide-react';

export default function DoctorDashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [currentDoc, setCurrentDoc] = useState<DoctorInfo | null>(null);
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<IntakeSession | null>(null);
  
  // Scoped Clinical Lists
  const [appointments, setAppointments] = useState<any[]>([]);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [loadingClinical, setLoadingClinical] = useState(false);

  // Layout Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'emergency' | 'appointments' | 'patients' | 'followups' | 'settings'>('dashboard');

  // Interactivity States
  const [searchQuery, setSearchQuery] = useState('');
  const [guidelineQuery, setGuidelineQuery] = useState('');
  const [guidelineResults, setGuidelineResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);
  const [modifiedPlanSteps, setModifiedPlanSteps] = useState<string[]>([]);
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [selectedEmergencyCase, setSelectedEmergencyCase] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Change password state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwStatus, setPwStatus] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!authUser) return;
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      setPwStatus('Please fill in all fields.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwStatus('New passwords do not match.');
      return;
    }
    if (pwForm.newPassword.length < 3) {
      setPwStatus('Password must be at least 3 characters.');
      return;
    }
    setPwLoading(true);
    try {
      const res = await api.changeDoctorPassword(authUser.doctorId, pwForm.currentPassword, pwForm.newPassword);
      if (res.success) {
        setPwStatus('✅ Password changed successfully!');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        showToast('Password updated!', 'success');
      } else {
        setPwStatus(res.error || 'Failed to change password.');
      }
    } catch (err) {
      setPwStatus((err as Error).message);
    } finally {
      setPwLoading(false);
    }
  };

  // Fetch clinical data when doctor profile loads
  useEffect(() => {
    if (!currentDoc) return;
    loadClinicalRegistry();
  }, [currentDoc]);

  // Handle auto-sync
  useEffect(() => {
    if (authUser && authUser.role === 'doctor') {
      const interval = setInterval(() => {
        loadClinicalRegistry(true);
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [authUser, currentDoc]);

  const loadClinicalRegistry = (isBackground = false) => {
    if (!currentDoc) return;
    if (!isBackground) setLoadingClinical(true);

    // Load ONLY real sessions routed to this department from AI intake
    api.getSessionsByDepartment(currentDoc.department)
      .then((deptSessions) => {
        setSessions(deptSessions);
        if (selectedSession) {
          const updated = deptSessions.find((s: any) => s.id === selectedSession.id);
          if (updated) setSelectedSession(updated);
        }
      })
      .catch((err) => console.error('Failed to load clinical workspace data:', err))
      .finally(() => {
        if (!isBackground) setLoadingClinical(false);
      });
  };

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleAuthLogin = async (user: AuthUser) => {
    setAuthUser(user);
    if (user.role === 'doctor') {
      try {
        const docs = await api.getDoctors();
        const doc = docs.find((d) => d.id === user.doctorId);
        if (doc) {
          setCurrentDoc(doc);
          showToast(`Workstation loaded for ${doc.name}`, 'success');
        }
      } catch {
        showToast('Could not fetch doctor profile', 'error');
      }
    }
  };

  const handleLogout = () => {
    setAuthUser(null);
    setCurrentDoc(null);
    setSelectedSession(null);
    setModifiedPlanSteps([]);
    setActiveTab('dashboard');
  };

  // Complete Followup task
  const handleCompleteFollowup = (id: string, name: string) => {
    setFollowups(prev => prev.filter(f => f.id !== id));
    showToast(`Treatment check-in resolved for ${name}. Notification logged in patient history.`, 'success');
  };

  // Trigger patient announcement alert
  const handlePagePatient = (patientName: string) => {
    showToast(`📢 PAGING PATIENT: "${patientName}" please proceed to Floor ${currentDoc?.floor}, Room ${currentDoc?.room}.`, 'info');
  };

  // Review and generate Gemini clinical treatment pathways
  const handleReviewAI = (patientName: string) => {
    // Find matching session in raw list
    const found = sessions.find(s => s.profile?.name?.toLowerCase().includes(patientName.toLowerCase()));
    if (found) {
      setSelectedSession(found);
      setModifiedPlanSteps(found.treatmentPlan || []);
      setShowHandoffModal(true);
    } else {
      showToast(`AI summary analysis ready. Loading diagnostic chart...`, 'info');
      // Create emergency dynamic intake link
      const fakeSession: IntakeSession = {
        id: `cardiac-${Date.now()}`,
        patientId: `pat-${Date.now()}`,
        phase: 'complete',
        profile: { name: patientName, age: 52, gender: 'Male', existingConditions: ['Hypertension'] },
        symptoms: { symptoms: ['Chest pain', 'diaphoresis'], severity: 'high', duration: '3 hours' },
        messages: [],
        triage: { urgency: 'emergency', department: currentDoc?.department || 'Cardiology', redFlags: ['Chest Pain'], reasoning: 'Acute coronary syndrome symptoms detected.', safetyOverride: true },
        clinicianHandoff: {
          summary: `52-year-old male presents with acute cardiac distress. Crushing chest tightness radiating to the jaw with extreme sweating. AI triage prioritized to ${currentDoc?.department || 'Cardiology'}.`,
          symptoms: ['Chest Pain', 'diaphoresis'],
          severity: 'high',
          possibleConcerns: ['Myocardial Infarction', 'Angina'],
          recommendedActions: ['Perform ECG within 5 mins', 'Administer emergency oxygen', 'Notify Cath lab lead'],
          department: currentDoc?.department || 'Cardiology',
          urgency: 'emergency'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fieldsCollected: []
      };
      setSelectedSession(fakeSession);
      setModifiedPlanSteps([]);
      setShowHandoffModal(true);
    }
  };

  // RAG guidelines search helper
  const handleSearchGuidelines = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!guidelineQuery.trim()) return;
    setSearchLoading(true);

    try {
      const res = await api.searchGuidelines(guidelineQuery);
      setGuidelineResults(res);
    } catch {
      setGuidelineResults([
        {
          id: 'offline-guide',
          symptom: guidelineQuery,
          department: currentDoc?.department || 'Cardiology',
          guideline: `Offline fallback protocol: Evaluate ${guidelineQuery} within ${currentDoc?.department} criteria. Screen vitals, monitor ECG parameters, and initiate first-line therapeutic support.`,
          clarifying_questions: ['When did pain peak?', 'Is the pain sharp or crushing?'],
          red_flags: ['Shortness of breath', 'Hypotension']
        }
      ]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Generate treatment plan calling Gemini API
  const handleGeneratePlan = async () => {
    if (!selectedSession) return;
    setGeneratingPlan(true);
    showToast('Consulting CareAssist AI for treatment guidelines...', 'info');

    try {
      const res = await api.generateTreatmentPlan(selectedSession.id);
      if (res.success) {
        setSelectedSession(res.session);
        setModifiedPlanSteps(res.plan);
        setSessions(prev => prev.map(s => s.id === res.session.id ? res.session : s));
        showToast('AI Action Pathway successfully synthesized!', 'success');
      }
    } catch (e) {
      // Offline fallback
      const plan = [
        `Initiate priority clinical review with ${currentDoc?.name} at Floor ${currentDoc?.floor}, Room ${currentDoc?.room}.`,
        "Arrange dynamic monitoring check-ins every 12 hours.",
        `Rest, restrict cardiac load, and notify emergency care on any symptom worsening.`
      ];
      const fallbackSession = {
        ...selectedSession,
        treatmentPlan: plan
      };
      setSelectedSession(fallbackSession);
      setModifiedPlanSteps(plan);
      showToast('AI offline pathways activated.', 'info');
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Save edits made to treatment plan
  const handleSavePlanEdits = () => {
    if (!selectedSession) return;
    const updated = {
      ...selectedSession,
      treatmentPlan: modifiedPlanSteps
    };
    setSelectedSession(updated);
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
    setEditingPlan(false);
    showToast('Clinical treatment pathways successfully updated.', 'success');
  };

  // Simulation Check-in triggers
  const handleSimulateCheckin = (type: 'emergency' | 'pediatric') => {
    const mockId = `sim-session-${Date.now()}`;
    const newSession: IntakeSession = {
      id: mockId,
      patientId: `sim-pat-${Date.now()}`,
      phase: 'complete',
      profile: {
        name: type === 'emergency' ? 'David Kim' : 'Tommy Miller',
        age: type === 'emergency' ? 59 : 6,
        gender: type === 'emergency' ? 'Male' : 'Male',
        existingConditions: type === 'emergency' ? ['Hypertension'] : ['Asthma'],
        medications: type === 'emergency' ? ['Lisinopril'] : ['Albuterol'],
        allergies: ['Penicillin']
      },
      symptoms: {
        symptoms: type === 'emergency' ? ['chest pain', 'sweating'] : ['acute cough', 'wheezing'],
        duration: type === 'emergency' ? '2 hours' : '1 day',
        severity: 'high'
      },
      messages: [],
      structuredIntake: {
        symptoms: type === 'emergency' ? ['chest pain', 'sweating'] : ['cough', 'wheezing'],
        duration: type === 'emergency' ? '2 hours' : '1 day',
        severity: 'high',
        recommended_department: currentDoc?.department || 'Cardiology',
        urgency: type === 'emergency' ? 'emergency' : 'urgent',
        possible_concerns: type === 'emergency' ? ['Myocardial Infarction'] : ['Asthma Flareup'],
        red_flags_detected: type === 'emergency' ? ['chest pain'] : []
      },
      triage: {
        urgency: type === 'emergency' ? 'emergency' : 'urgent',
        department: currentDoc?.department || 'Cardiology',
        redFlags: type === 'emergency' ? ['chest pain with sweating'] : [],
        reasoning: 'AI escalation: high severity indicators matched.',
        safetyOverride: true
      },
      clinicianHandoff: {
        summary: type === 'emergency'
          ? '59-year-old male presents with acute cardiac discomfort and chest pain radiating to jaw.'
          : '6-year-old child presents with sharp wheezing and pediatric dry cough.',
        symptoms: type === 'emergency' ? ['chest pain', 'sweating'] : ['cough', 'wheezing'],
        severity: 'high',
        possibleConcerns: type === 'emergency' ? ['Myocardial Infarction'] : ['Asthma'],
        recommendedActions: ['Perform cardiac screens', 'Monitor oxygen saturation'],
        department: currentDoc?.department || 'Cardiology',
        urgency: type === 'emergency' ? 'emergency' : 'urgent'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fieldsCollected: []
    };

    setSessions(prev => [newSession, ...prev]);
    showToast(`⚠️ Simulated patient check-in detected: ${newSession.profile?.name}`, 'info');
    loadClinicalRegistry(true);
    setShowSimPanel(false);
  };

  // If not authenticated at all, show login gate
  if (!authUser) {
    return <LoginGate onLogin={handleAuthLogin} />;
  }

  // Redirect admin users
  if (authUser.role === 'admin') {
    return (
      <div className="max-w-md mx-auto my-24 p-8 glass bg-white border border-slate-200 rounded-3xl text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-650 flex items-center justify-center mx-auto border animate-bounce">
          <UserCheck className="w-6 h-6" />
        </div>
        <h3 className="font-display font-black text-slate-800 text-lg">Hospital Administrator Session</h3>
        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
          You are authenticated as the Hospital Administrator. Please proceed to the global Operations Console.
        </p>
        <button
          onClick={() => { window.location.href = '/dashboard'; }}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all"
        >
          Open Admin Console
        </button>
        <button
          onClick={handleLogout}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-xs font-bold transition-all"
        >
          Sign Out
        </button>
      </div>
    );
  }

  if (!currentDoc) {
    return (
      <div className="max-w-md mx-auto my-32 text-center text-slate-500">
        <div className="animate-pulse text-sm font-bold">Synchronizing Clinical Workspace...</div>
      </div>
    );
  }

  // Search filter patients
  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.condition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-65px)] flex bg-slate-50 text-slate-700 font-sans overflow-hidden">
      {/* Floating Notifications */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border text-xs font-semibold max-w-sm transition-all animate-bounce ${
          toastMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          toastMessage.type === 'info' ? 'bg-sky-50 border-sky-200 text-sky-850' : 'bg-emerald-50 border-emerald-200 text-emerald-850'
        }`}>
          <Bell className="w-4 h-4 text-indigo-600 animate-swing" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* LEFT SIDEBAR PANEL */}
      <aside className="w-64 border-r bg-white flex flex-col shrink-0">
        {/* Clinician Profile */}
        <div className="p-6 border-b flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 border rounded-2xl flex items-center justify-center text-indigo-650 shrink-0 shadow-sm">
            <span className="font-display font-black text-sm uppercase">IMG</span>
          </div>
          <div className="overflow-hidden">
            <h4 className="font-display font-black text-slate-800 text-xs truncate uppercase">{currentDoc.name}</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{currentDoc.department} Dept</p>
          </div>
        </div>

        {/* Sidebar Navigations */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-650 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('emergency')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'emergency' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-650 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4" />
              <span>Emergency Queue</span>
            </div>
            {sessions.filter((s: any) => ['emergency','urgent','high'].includes(s.triage?.urgency)).length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${
                activeTab === 'emergency' ? 'bg-white text-indigo-650' : 'bg-red-100 text-red-750 border-red-200'
              }`}>
                {sessions.filter((s: any) => ['emergency','urgent','high'].includes(s.triage?.urgency)).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'appointments' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-650 hover:bg-slate-100'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Appointments</span>
          </button>

          <button
            onClick={() => setActiveTab('patients')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'patients' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-650 hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Patients</span>
          </button>

          <button
            onClick={() => setActiveTab('followups')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'followups' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-650 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <ClipboardList className="w-4 h-4" />
              <span>Follow-ups</span>
            </div>
            {sessions.filter((s: any) => s.approvalStatus === 'approved').length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${
                activeTab === 'followups' ? 'bg-indigo-100 text-indigo-850' : 'bg-slate-200/60 text-slate-550'
              }`}>
                {sessions.filter((s: any) => s.approvalStatus === 'approved').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-650 hover:bg-slate-100'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings / AI Tools</span>
          </button>
        </nav>

        {/* Action Panel Footer */}
        <div className="p-4 border-t space-y-2">
          <button
            onClick={() => setShowSimPanel(true)}
            className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Simulation Trigger</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit Workstation</span>
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto">
        <header className="px-8 py-4 bg-white border-b flex items-center justify-between shadow-sm shrink-0">
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-indigo-600" /> MEDICARE CLINICAL WORKSPACE
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Clinical Area • Floor {currentDoc.floor}, Room {currentDoc.room} ({currentDoc.hospitalLocation})
            </p>
          </div>
          <button
            onClick={() => loadClinicalRegistry()}
            className="p-2 text-slate-550 hover:bg-slate-100 rounded-xl border transition flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingClinical ? 'animate-spin' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-wider">Sync Registry</span>
          </button>
        </header>

        <div className="flex-1 p-8 space-y-6">
          {/* ──────────────────────────────────────────────────────── */}
          {/* TABS: DASHBOARD TAB */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Headline */}
              <div className="border-b pb-4">
                <h3 className="font-display font-black text-slate-800 text-lg uppercase">Dashboard Overview</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Real-time patient intake sessions routed to your department</p>
              </div>

              {/* Statistics Row — All from sessions */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Intake Sessions</span>
                  <div className="text-2xl font-black text-slate-800 font-display">{sessions.length}</div>
                  <span className="text-[10px] text-slate-500 font-semibold">Routed to your dept</span>
                </div>

                <div className="glass bg-white p-5 border-l-4 border-l-green-600 border border-slate-200 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Approved</span>
                  <div className="text-2xl font-black text-green-700 font-display flex items-center gap-2">
                    {sessions.filter((s: any) => s.approvalStatus === 'approved').length}
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">Ready to treat</span>
                </div>

                <div className="glass bg-white p-5 border-l-4 border-l-amber-500 border border-slate-200 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Pending Approval</span>
                  <div className="text-2xl font-black text-amber-600 font-display flex items-center gap-2">
                    {sessions.filter((s: any) => s.approvalStatus === 'pending').length}
                    {sessions.filter((s: any) => s.approvalStatus === 'pending').length > 0 && <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />}
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">Awaiting admin</span>
                </div>

                <div className="glass bg-white p-5 border-l-4 border-l-red-500 border border-slate-200 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Urgent/Emergency</span>
                  <div className="text-2xl font-black text-red-600 font-display flex items-center gap-2">
                    {sessions.filter((s: any) => ['emergency','urgent','high'].includes(s.triage?.urgency)).length}
                    {sessions.filter((s: any) => ['emergency','urgent','high'].includes(s.triage?.urgency)).length > 0 && <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />}
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">High priority</span>
                </div>
              </div>

              {/* Approved Patients (ready to treat) + Pending Patients */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Approved patients — ready for consultation */}
                <div className="lg:col-span-6 glass bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <h4 className="font-display font-black text-slate-800 text-xs uppercase flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-green-600" /> Approved Patients
                    </h4>
                    <span className="text-[9px] font-black bg-green-100 text-green-800 px-2 py-0.5 rounded-full uppercase border">
                      {sessions.filter((s: any) => s.approvalStatus === 'approved').length} Ready
                    </span>
                  </div>
                  <div className="space-y-3">
                    {sessions.filter((s: any) => s.approvalStatus === 'approved').length === 0 && (
                      <p className="text-xs text-slate-400 italic py-4 text-center">No approved sessions yet. Admin must approve intake sessions first.</p>
                    )}
                    {sessions.filter((s: any) => s.approvalStatus === 'approved').map((s: any) => (
                      <div key={s.id} className="p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all"
                        onClick={() => { setSelectedSession(s); setShowHandoffModal(true); }}>
                        <div>
                          <div className="font-black text-slate-900 text-sm">{s.profile?.name || 'Unknown'}, Age {s.profile?.age || '?'}</div>
                          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">{(s.symptoms?.symptoms || []).join(', ') || 'No symptoms recorded'}</div>
                        </div>
                        <span className="text-[9px] font-black shrink-0 bg-green-700 text-white px-2 py-1 rounded font-mono uppercase">
                          {s.triage?.urgency || 'medium'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Pending intake sessions */}
                <div className="lg:col-span-6 glass bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <h4 className="font-display font-black text-slate-800 text-xs uppercase flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" /> Pending Review
                    </h4>
                    <span className="text-[9px] font-bold text-slate-400">{sessions.filter((s: any) => s.approvalStatus === 'pending').length} awaiting</span>
                  </div>
                  <div className="space-y-3">
                    {sessions.filter((s: any) => s.approvalStatus === 'pending').length === 0 && (
                      <p className="text-xs text-slate-400 italic py-4 text-center">No pending sessions. New patient intakes will appear here automatically.</p>
                    )}
                    {sessions.filter((s: any) => s.approvalStatus === 'pending').map((s: any) => (
                      <div key={s.id} className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
                        <div>
                          <div className="font-black text-slate-900 text-sm">{s.profile?.name || 'Unknown'}, Age {s.profile?.age || '?'}</div>
                          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">{(s.symptoms?.symptoms || []).join(', ') || 'Intake in progress'}</div>
                        </div>
                        <span className="text-[9px] font-black shrink-0 bg-amber-500 text-white px-2 py-1 rounded font-mono uppercase">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'emergency' && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h3 className="font-display font-black text-slate-800 text-lg uppercase flex items-center gap-2">
                  <HeartCrack className="w-6 h-6 text-red-500 animate-pulse" /> Emergency / Urgent Cases
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">High-priority intake sessions requiring immediate clinical attention</p>
              </div>
              <div className="space-y-4">
                {sessions.filter((s: any) => ['emergency','urgent','high'].includes(s.triage?.urgency)).map((s: any) => (
                  <div key={s.id} className="glass bg-white border border-red-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-black text-slate-900 text-lg uppercase">{s.profile?.name || 'Unknown'}</h4>
                          <span className="text-[9px] font-black bg-red-600 text-white px-2 py-0.5 rounded font-mono uppercase">
                            {s.triage?.urgency || 'urgent'}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${s.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {s.approvalStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                          Age: {s.profile?.age || '?'} • Gender: {s.profile?.gender || '?'} • Dept: {s.triage?.department}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl space-y-1">
                      <span className="text-[9px] font-black text-red-800 uppercase tracking-widest">AI Triage Reasoning</span>
                      <p className="text-xs text-red-700 font-bold leading-relaxed">{s.triage?.reasoning || 'No reasoning provided'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Symptoms</span>
                      <div className="text-xs font-extrabold text-slate-800">{(s.symptoms?.symptoms || []).join(', ') || 'Not recorded'}</div>
                    </div>
                    <button onClick={() => { setSelectedSession(s); setShowHandoffModal(true); }}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all uppercase tracking-wider">
                      Review Full Intake
                    </button>
                  </div>
                ))}
                {sessions.filter((s: any) => ['emergency','urgent','high'].includes(s.triage?.urgency)).length === 0 && (
                  <div className="p-8 text-center bg-white border rounded-2xl text-slate-400 font-semibold text-xs">
                    No emergency or urgent intake sessions routed to this department.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TABS: APPOINTMENTS TAB */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h3 className="font-display font-black text-slate-800 text-lg uppercase flex items-center gap-2">
                  <CalendarIcon className="w-6 h-6 text-indigo-600" /> Intake Sessions
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">All AI intake sessions routed to your department</p>
              </div>
              <div className="glass bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      <th className="p-4 pl-6">Patient</th>
                      <th className="p-4">Age</th>
                      <th className="p-4">Symptoms</th>
                      <th className="p-4">AI Urgency</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {sessions.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="p-4 pl-6 font-black text-slate-900">{s.profile?.name || 'Unknown'}</td>
                        <td className="p-4 text-slate-500">{s.profile?.age || '?'}</td>
                        <td className="p-4 text-slate-500 max-w-[200px] truncate">{(s.symptoms?.symptoms || []).join(', ') || '—'}</td>
                        <td className="p-4">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            ['emergency','urgent','high'].includes(s.triage?.urgency) ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600 border'
                          }`}>
                            {s.triage?.urgency || 'medium'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                            s.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                            s.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {s.approvalStatus}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <button onClick={() => { setSelectedSession(s); setShowHandoffModal(true); }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold shadow-sm transition-all">
                            View Intake
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sessions.length === 0 && (
                  <div className="p-8 text-center text-slate-400 font-semibold text-xs">
                    No intake sessions have been routed to this department yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TABS: PATIENTS TAB */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'patients' && (
            <div className="space-y-6">
              <div className="border-b pb-4 flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                  <h3 className="font-display font-black text-slate-800 text-lg uppercase flex items-center gap-2">
                    <User className="w-6 h-6 text-indigo-650" /> Patient Records
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">All patients routed to your department via AI intake</p>
                </div>
                <div className="w-full sm:w-64 relative shrink-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search patients..." className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {sessions.filter((s: any) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return (s.profile?.name || '').toLowerCase().includes(q) || (s.symptoms?.symptoms || []).join(' ').toLowerCase().includes(q);
                }).map((s: any) => (
                  <div key={s.id} className="glass bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-display font-black text-slate-900 text-sm truncate uppercase">{s.profile?.name || 'Unknown'}</h4>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                          s.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-700'
                        }`}>{s.approvalStatus}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Age: {s.profile?.age || '?'} • Gender: {s.profile?.gender || '?'}</p>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Symptoms</span>
                        <div className="text-xs font-extrabold text-slate-800 leading-relaxed">{(s.symptoms?.symptoms || []).join(', ') || 'Not recorded'}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">AI Triage</span>
                        <div className="text-xs font-semibold text-slate-550">{s.triage?.urgency || 'medium'} priority • {s.triage?.department}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Intake Date</span>
                        <div className="text-xs font-semibold text-slate-550">{new Date(s.createdAt || s.updatedAt).toLocaleString()}</div>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedSession(s); setShowHandoffModal(true); }}
                      className="w-full py-2 bg-slate-50 border hover:bg-slate-100 text-slate-750 rounded-xl text-[10px] font-extrabold transition-all uppercase tracking-wider flex items-center justify-center gap-1">
                      <span>View Full Intake</span><ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="p-8 text-center bg-white border rounded-2xl text-slate-400 font-semibold text-xs col-span-3">
                    No patients have been routed to your department yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TABS: FOLLOW-UPS TAB */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'followups' && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h3 className="font-display font-black text-slate-800 text-lg uppercase flex items-center gap-2">
                  <ClipboardList className="w-6 h-6 text-indigo-650" /> Patient Follow-ups
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Approved patients with prescribed treatment plans and follow-up monitoring</p>
              </div>
              <div className="space-y-4">
                {sessions.filter((s: any) => s.approvalStatus === 'approved').map((s: any) => (
                  <div key={s.id} className="glass bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                    {/* Patient Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-display font-black text-slate-900 text-sm uppercase">{s.profile?.name || 'Unknown'}</h4>
                          <span className="text-[9px] font-black font-mono bg-green-50 border border-green-200 text-green-800 px-2 py-0.5 rounded uppercase">
                            Approved
                          </span>
                          {['emergency','urgent','high'].includes(s.triage?.urgency) && (
                            <span className="text-[9px] font-black bg-red-100 border border-red-200 text-red-750 px-2 py-0.5 rounded uppercase">Urgent</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Age: {s.profile?.age || '?'} • Gender: {s.profile?.gender || '?'} • Dept: {s.triage?.department}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => { setSelectedSession(s); setShowHandoffModal(true); }}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-extrabold transition-all uppercase tracking-wider">
                          View Full Intake
                        </button>
                        <button onClick={() => { showToast(`Follow-up completed for ${s.profile?.name}. Marked in system.`, 'success'); }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-extrabold shadow-md transition-all uppercase tracking-wider">
                          Complete
                        </button>
                      </div>
                    </div>

                    {/* Symptoms */}
                    <div className="p-3 bg-slate-50 rounded-xl border space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Presenting Symptoms</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(s.symptoms?.symptoms || []).map((sym: string, idx: number) => (
                          <span key={idx} className="text-[10px] font-bold bg-white text-slate-700 px-2.5 py-0.5 rounded-full border">{sym}</span>
                        ))}
                        {(!s.symptoms?.symptoms || s.symptoms.symptoms.length === 0) && (
                          <span className="text-[10px] text-slate-400 italic">No symptoms recorded</span>
                        )}
                      </div>
                    </div>

                    {/* Possible Concerns */}
                    {(s.clinicianHandoff?.possibleConcerns?.length > 0) && (
                      <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl space-y-1">
                        <span className="text-[9px] font-bold text-amber-700 uppercase tracking-widest block">AI Possible Concerns</span>
                        <div className="flex flex-wrap gap-1.5">
                          {s.clinicianHandoff.possibleConcerns.map((c: string, idx: number) => (
                            <span key={idx} className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prescribed Treatment Plan */}
                    <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2">
                      <span className="text-[9px] font-black text-indigo-800 uppercase tracking-widest flex items-center gap-1.5">
                        <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" /> Prescribed Treatment Plan
                      </span>
                      {s.treatmentPlan && s.treatmentPlan.length > 0 ? (
                        <div className="space-y-1.5">
                          {s.treatmentPlan.map((step: string, idx: number) => (
                            <div key={idx} className="flex gap-2 text-xs font-semibold text-slate-700">
                              <span className="text-indigo-600 font-black shrink-0">{idx + 1}.</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No treatment plan generated yet. Open full intake to generate one via AI.</p>
                      )}
                    </div>

                    {/* Recommended Actions */}
                    {(s.clinicianHandoff?.recommendedActions?.length > 0) && (
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1.5">
                        <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest block">Recommended Follow-up Actions</span>
                        <ul className="list-disc pl-4 text-xs font-semibold text-slate-650 space-y-0.5">
                          {s.clinicianHandoff.recommendedActions.map((a: string, idx: number) => (
                            <li key={idx}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Intake Date */}
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 pt-1 border-t">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Intake: {new Date(s.createdAt || s.updatedAt).toLocaleDateString()} at {new Date(s.createdAt || s.updatedAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                {sessions.filter((s: any) => s.approvalStatus === 'approved').length === 0 && (
                  <div className="p-8 text-center bg-white border rounded-2xl text-slate-400 font-semibold text-xs">
                    No approved patients requiring follow-up yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TABS: SETTINGS / AI GUIDELINES SEARCH TAB */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b pb-4">
                <h3 className="font-display font-black text-slate-800 text-lg uppercase flex items-center gap-2">
                  <BrainCircuit className="w-6 h-6 text-indigo-650" /> Guidelines RAG Search Engine
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Securely query clinical RAG protocols, deterministic severity scoring mechanisms, and vectors</p>
              </div>

              {/* RAG query box */}
              <div className="glass bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <form onSubmit={handleSearchGuidelines} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={guidelineQuery}
                      onChange={(e) => setGuidelineQuery(e.target.value)}
                      placeholder="e.g. chest pain, hypertension crisis, dynamic arrhythmias..."
                      className="w-full pl-10 pr-4 py-3 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow"
                  >
                    Query Vector DB
                  </button>
                </form>

                {/* Search Results Display */}
                {searchLoading ? (
                  <div className="py-12 text-center text-slate-400 font-semibold text-xs animate-pulse">
                    Scanning Pinecone medical vectors...
                  </div>
                ) : guidelineResults.length > 0 ? (
                  <div className="space-y-4 pt-2">
                    {guidelineResults.map((g: any, index: number) => (
                      <div key={index} className="p-5 bg-slate-50 border rounded-2xl space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="font-display font-black text-slate-900 text-sm uppercase">{g.symptom} Protocol</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Department Target: {g.department}</p>
                          </div>
                          <span className="text-[9px] font-black font-mono bg-indigo-100 text-indigo-850 px-2 py-0.5 rounded uppercase border">
                            RAG Match
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">First-line Guidelines</span>
                          <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white p-3 border rounded-xl">{g.guideline}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block text-red-650">Red Flags</span>
                            <ul className="list-disc pl-4 text-xs font-bold text-slate-700 uppercase space-y-0.5">
                              {g.red_flags?.map((rf: string, idx: number) => (
                                <li key={idx}>{rf}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Clarifying Triggers</span>
                            <ul className="list-disc pl-4 text-xs font-semibold text-slate-600 space-y-0.5">
                              {g.clarifying_questions?.map((cq: string, idx: number) => (
                                <li key={idx}>{cq}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 font-semibold text-xs bg-slate-50 rounded-2xl">
                    Query symptom context to pull live medical RAG guidelines instantly.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODAL DIALOGS AND OVERLAYS */}
      {/* ──────────────────────────────────────────────────────── */}

      {/* 1. CLINICAL HANDOFF & TREATMENT PATHWAYS MODAL */}
      {showHandoffModal && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-start pb-4 border-b">
              <div>
                <h3 className="font-display font-black text-slate-900 text-lg uppercase flex items-center gap-2">
                  <BrainCircuit className="w-6 h-6 text-indigo-650 animate-pulse" /> Patient Clinical Handoff
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Name: {selectedSession.profile?.name} • Age: {selectedSession.profile?.age} • Severity: {selectedSession.symptoms?.severity}
                </p>
              </div>
              <button onClick={() => setShowHandoffModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* AI Diagnostics Summary */}
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-1">
                <span className="text-[9px] font-black text-indigo-850 uppercase tracking-widest block">AI Diagnostic Summary</span>
                <p className="text-xs text-indigo-755 font-bold leading-relaxed">
                  {selectedSession.clinicianHandoff?.summary || 'No diagnostic summary generated yet.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Identified Symptoms</span>
                  <div className="flex flex-wrap gap-1">
                    {(selectedSession.clinicianHandoff?.symptoms || selectedSession.symptoms?.symptoms || []).map((s: string, idx: number) => (
                      <span key={idx} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block text-red-650">Possible AI Concerns</span>
                  <div className="flex flex-wrap gap-1">
                    {(selectedSession.clinicianHandoff?.possibleConcerns || []).map((c: string, idx: number) => (
                      <span key={idx} className="text-[10px] font-bold bg-red-50 text-red-750 px-2 py-0.5 rounded border border-red-100">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* RAG Medical action recommendations */}
              <div className="space-y-2 border-t pt-4">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Recommended Intake Actions</span>
                <ul className="list-disc pl-4 text-xs font-semibold text-slate-650 space-y-1">
                  {(selectedSession.clinicianHandoff?.recommendedActions || []).map((a: string, idx: number) => (
                    <li key={idx}>{a}</li>
                  ))}
                </ul>
              </div>

              {/* TREATMENT PLAN SYSTEM */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                    <BrainCircuit className="w-4 h-4 text-indigo-650" /> Gemini Treatment Pathways
                  </span>
                  {!selectedSession.treatmentPlan && (
                    <button
                      onClick={handleGeneratePlan}
                      disabled={generatingPlan}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold transition-all uppercase tracking-wider disabled:bg-slate-200"
                    >
                      {generatingPlan ? 'Synthesizing Pathway...' : 'Generate Plan'}
                    </button>
                  )}
                </div>

                {selectedSession.treatmentPlan ? (
                  <div className="space-y-3">
                    {editingPlan ? (
                      <div className="space-y-2">
                        {modifiedPlanSteps.map((step, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              type="text"
                              value={step}
                              onChange={(e) => {
                                const copy = [...modifiedPlanSteps];
                                copy[idx] = e.target.value;
                                setModifiedPlanSteps(copy);
                              }}
                              className="flex-1 px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              onClick={() => setModifiedPlanSteps(prev => prev.filter((_, i) => i !== idx))}
                              className="p-2 hover:bg-red-50 text-red-650 rounded-xl"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setModifiedPlanSteps(prev => [...prev, 'New step recommendation...'])}
                          className="text-[10px] text-indigo-650 font-bold uppercase tracking-wider flex items-center gap-1"
                        >
                          + Add Step
                        </button>
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={handleSavePlanEdits}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all"
                          >
                            Save Pathway
                          </button>
                          <button
                            onClick={() => { setEditingPlan(false); setModifiedPlanSteps(selectedSession.treatmentPlan || []); }}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="bg-slate-50 border rounded-xl p-4 space-y-2">
                          {selectedSession.treatmentPlan.map((step: string, idx: number) => (
                            <div key={idx} className="flex gap-2 text-xs font-semibold text-slate-700">
                              <span className="text-indigo-600 font-black">{idx + 1}.</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => { setEditingPlan(true); setModifiedPlanSteps(selectedSession.treatmentPlan || []); }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-250 text-slate-750 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Modify Pathways
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 font-semibold italic">Generate a personalized action pathway using Gemini clinical protocols.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS TAB - CHANGE PASSWORD */}
      {activeTab === 'settings' && (
        <div className="flex-1 p-8">
          <div className="max-w-lg space-y-6">
            <div className="border-b pb-4">
              <h3 className="font-display font-black text-slate-800 text-lg uppercase">Settings</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage your account and preferences.</p>
            </div>

            {/* Change Password Card */}
            <div className="bg-white border rounded-2xl p-6 space-y-4 shadow-sm">
              <h4 className="font-display font-black text-slate-800 text-sm uppercase flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" /> Change Password
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Current Password</label>
                  <input
                    type="password"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">New Password</label>
                  <input
                    type="password"
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                  />
                </div>
              </div>

              {pwStatus && (
                <p className={`text-xs font-semibold ${pwStatus.startsWith('✅') ? 'text-emerald-600' : 'text-red-600'}`}>
                  {pwStatus}
                </p>
              )}

              <button
                onClick={handleChangePassword}
                disabled={pwLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow transition-all disabled:opacity-50"
              >
                {pwLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>

            {/* Doctor Profile Card */}
            {currentDoc && (
              <div className="bg-white border rounded-2xl p-6 space-y-3 shadow-sm">
                <h4 className="font-display font-black text-slate-800 text-sm uppercase">Profile</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-slate-400 font-bold">Name:</span> <span className="font-semibold text-slate-700">{currentDoc.name}</span></div>
                  <div><span className="text-slate-400 font-bold">Department:</span> <span className="font-semibold text-slate-700">{currentDoc.department}</span></div>
                  <div><span className="text-slate-400 font-bold">Specialty:</span> <span className="font-semibold text-slate-700">{currentDoc.specialty}</span></div>
                  <div><span className="text-slate-400 font-bold">Floor:</span> <span className="font-semibold text-slate-700">{currentDoc.floor}</span></div>
                  <div><span className="text-slate-400 font-bold">Room:</span> <span className="font-semibold text-slate-700">{currentDoc.room}</span></div>
                  <div><span className="text-slate-400 font-bold">Location:</span> <span className="font-semibold text-slate-700">{currentDoc.hospitalLocation}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. EMERGENCY VITALS OVERLAY */}
      {showVitalsModal && selectedEmergencyCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="font-display font-black text-slate-900 text-base uppercase flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600 animate-pulse" /> Telemetry Vital Feed
              </h3>
              <button onClick={() => setShowVitalsModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="font-black text-slate-800 text-sm uppercase">Patient: {selectedEmergencyCase.name}</div>
              
              {/* Vitals grids */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border rounded-2xl text-center space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Blood Pressure</span>
                  <span className="text-sm font-black text-slate-900">{selectedEmergencyCase.vitals.bloodPressure}</span>
                  <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block">mmHg</span>
                </div>
                <div className="p-4 bg-slate-50 border rounded-2xl text-center space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Heart Rate</span>
                  <span className="text-sm font-black text-indigo-600">{selectedEmergencyCase.vitals.heartRate} bpm</span>
                  <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block">Sinus Tachycardia</span>
                </div>
                <div className="p-4 bg-slate-50 border rounded-2xl text-center space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">SpO2 Oxygen</span>
                  <span className="text-sm font-black text-indigo-600">{selectedEmergencyCase.vitals.oxygenSaturation}%</span>
                  <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block">Mild Hypoxia</span>
                </div>
                <div className="p-4 bg-slate-50 border rounded-2xl text-center space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Temperature</span>
                  <span className="text-sm font-black text-slate-900">{selectedEmergencyCase.vitals.temperature}</span>
                  <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block">Normal Range</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => { setShowVitalsModal(false); handleReviewAI(selectedEmergencyCase.name); }}
              className="w-full py-3 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all"
            >
              Analyze Handoff Chart
            </button>
          </div>
        </div>
      )}

      {/* 3. SIMULATOR CONTROL DRAWER */}
      {showSimPanel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" /> Clinical Simulation Triggers
              </h3>
              <button onClick={() => setShowSimPanel(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium">Inject high-risk simulated patient check-ins directly into this doctor's clinical queue to test live RAG triage feeds.</p>
            
            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                onClick={() => handleSimulateCheckin('emergency')}
                className="p-4 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-150 rounded-2xl text-left transition flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-black text-indigo-850 uppercase">David Kim (Acute Chest Pain)</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">59yo M • Subdiaphoresis & Chest tightening (EMERGENCY)</div>
                </div>
                <Play className="w-4 h-4 text-indigo-600 shrink-0" />
              </button>

              <button
                onClick={() => handleSimulateCheckin('pediatric')}
                className="p-4 bg-slate-50 hover:bg-slate-100 border rounded-2xl text-left transition flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-black text-slate-800 uppercase">Tommy Miller (Wheezing)</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">6yo M • Acute cough & childhood asthma (URGENT)</div>
                </div>
                <Play className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
