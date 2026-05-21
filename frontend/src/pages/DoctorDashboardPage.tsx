import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AuthUser, DoctorInfo } from '../api/client';
import type { IntakeSession } from '../types';
import { UrgencyBadge } from '../components/UrgencyBadge';
import { LoginGate } from '../components/LoginGate';
import { AdminConsole } from '../components/AdminConsole';
import {
  User,
  Stethoscope,
  Building,
  MapPin,
  AlertOctagon,
  CheckCircle,
  LogOut,
  ChevronRight,
  TrendingUp,
  FileText,
  UserCheck,
  Bell,
  Heart,
  Search,
  Sparkles,
  PlusCircle,
  Edit3,
  Save,
  X,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from 'recharts';

type Doctor = DoctorInfo;

const COLORS = ['#dc2626', '#ea580c', '#d97706', '#ca8a04', '#16a34a'];

export default function DoctorDashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [currentDoc, setCurrentDoc] = useState<Doctor | null>(null);
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<IntakeSession | null>(null);
  const [reviewedPatients, setReviewedPatients] = useState<string[]>([]);

  // Premium interactive states
  const [activeLeftTab, setActiveLeftTab] = useState<'queue' | 'guidelines'>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);
  const [modifiedPlanSteps, setModifiedPlanSteps] = useState<string[]>([]);
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Fetch all sessions on mount
  useEffect(() => {
    if (authUser && authUser.role === 'doctor') fetchSessions();
  }, [authUser]);

  const fetchSessions = () => {
    setLoading(true);
    api.listSessions()
      .then((data) => {
        setSessions(data);
        if (currentDoc) {
          // Department-scoped: only show patients routed to this doctor's department
          const docPatients = data.filter((s) =>
            s.triage?.department === currentDoc.department ||
            s.doctorSuggestion?.doctorId === currentDoc.id
          );
          if (docPatients.length > 0) {
            const existingSelected = docPatients.find(p => p.id === selectedSession?.id);
            setSelectedSession(existingSelected || docPatients[0]);
          }
        }
      })
      .catch((err) => console.error('Error fetching sessions:', err))
      .finally(() => setLoading(false));
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
      // Fetch the actual doctor object from backend
      try {
        const docs = await api.getDoctors();
        const doc = docs.find((d: Doctor) => d.id === user.doctorId);
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
  };

  const handleReviewPatient = (sessionId: string) => {
    if (reviewedPatients.includes(sessionId)) return;
    setReviewedPatients((prev) => [...prev, sessionId]);
    showToast('Intake file accepted. Patient profile added to clinic registry.', 'success');
  };

  const handlePagePatient = (patientName: string, room: string) => {
    showToast(`📢 PAGING PATIENT: "${patientName}" please proceed to Floor ${currentDoc?.floor}, Room ${room}.`, 'info');
  };

  // Generate treatment plan calling backend Gemini API
  const handleGeneratePlan = async () => {
    if (!selectedSession) return;
    setGeneratingPlan(true);
    showToast('Consulting CareAssist AI for treatment guidelines...', 'info');

    try {
      const res = await api.generateTreatmentPlan(selectedSession.id);
      if (res.success) {
        // Update selected session details
        setSelectedSession(res.session);
        setModifiedPlanSteps(res.plan);
        // Sync in list
        setSessions(prev => prev.map(s => s.id === res.session.id ? res.session : s));
        showToast('AI Action Pathway successfully synthesized!', 'success');
      }
    } catch (e) {
      showToast((e as Error).message || 'Failed to generate plan. Using offline fallback.', 'error');
      // Offline fallback
      const plan = [
        `Schedule urgent follow-up at Floor ${currentDoc?.floor}, Room ${currentDoc?.room} with ${currentDoc?.name}.`,
        "Monitor vital signs and check in regularly.",
        `Rest, hydrate, and notify the nursing station of any ${selectedSession.symptoms.symptoms[0] || 'symptom'} worsening.`
      ];
      const fallbackSession = {
        ...selectedSession,
        treatmentPlan: plan
      };
      setSelectedSession(fallbackSession);
      setModifiedPlanSteps(plan);
      setSessions(prev => prev.map(s => s.id === fallbackSession.id ? fallbackSession : s));
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
    showToast('Clinical treatment modifications saved.', 'success');
  };

  // Search RAG Guidelines database
  const handleSearchGuidelines = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);

    try {
      const res = await api.searchGuidelines(searchQuery);
      setSearchResults(res);
      if (res.length === 0) {
        showToast('No exact guideline found. Displaying general medical protocols.', 'info');
      }
    } catch (err) {
      showToast('Offline mode: search results fallback initialized.', 'info');
      setSearchResults([
        {
          id: 'mock-guide',
          symptom: searchQuery,
          department: 'General Medicine',
          guideline: `Evaluate ${searchQuery} context. Perform complete physical examination, assess vital parameters, and order diagnostic screens as indicated.`,
          clarifying_questions: ['When did symptoms start?', 'How severe is the discomfort?'],
          red_flags: ['severe fever', 'shortness of breath']
        }
      ]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Simulate an incoming high-risk cardiac emergency patient
  const handleSimulateEmergency = () => {
    const mockId = `sim-session-${Date.now()}`;
    const newSession: IntakeSession = {
      id: mockId,
      patientId: `sim-pat-${Date.now()}`,
      phase: 'complete',
      profile: {
        name: 'David Kim',
        age: 59,
        gender: 'Male',
        existingConditions: ['Hypertension', 'High Cholesterol'],
        medications: ['Lisinopril', 'Atorvastatin'],
        allergies: ['Penicillin']
      },
      symptoms: {
        symptoms: ['chest pain', 'shortness of breath', 'sweating'],
        duration: '2 hours',
        severity: 'high'
      },
      messages: [
        { role: 'user', content: 'Help, I have severe chest pain and I am sweating', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'I understand, David. I am routing you to emergency care immediately. Proceed to the nearest hospital.', timestamp: new Date().toISOString() }
      ],
      structuredIntake: {
        symptoms: ['chest pain', 'shortness of breath', 'sweating'],
        duration: '2 hours',
        severity: 'high',
        recommended_department: 'Cardiology',
        urgency: 'emergency',
        possible_concerns: ['Acute Coronary Syndrome (ACS)', 'Myocardial Infarction'],
        red_flags_detected: ['chest pain with sweating', 'severe crushing chest pressure']
      },
      triage: {
        urgency: 'emergency',
        department: 'Cardiology',
        redFlags: ['chest pain with sweating'],
        reasoning: 'Critical cardiac red flag: chest pain coupled with sweating. Safety-first over-triage protocol engaged.',
        safetyOverride: true
      },
      clinicianHandoff: {
        summary: '59-year-old male with history of hypertension presents with acute chest pain and shortness of breath for 2 hours, accompanied by severe diaphoresis (sweating). Triage results: emergency Cardiology escalation required to rule out acute myocardial infarction.',
        symptoms: ['chest pain', 'shortness of breath', 'sweating'],
        severity: 'high',
        possibleConcerns: ['Myocardial Infarction', 'Acute Coronary Syndrome'],
        recommendedActions: [
          `Specialist: Dr. Sarah Jenkins (Interventional Cardiology)`,
          `Location: Floor 3, Room 305 (Building C, Wing 3)`,
          'Slot: IMMEDIATE',
          'Priority: EMERGENCY'
        ],
        department: 'Cardiology',
        urgency: 'emergency'
      },
      doctorSuggestion: {
        doctorId: 'doc-1', // Sarah Jenkins (Cardiology)
        doctorName: 'Dr. Sarah Jenkins',
        specialty: 'Interventional Cardiology',
        department: 'Cardiology',
        floor: 3,
        room: '305',
        hospitalLocation: 'Building C, Wing 3',
        appointmentTime: 'IMMEDIATE',
        infoSentToDoctor: true
      },
      fieldsCollected: ['name', 'age', 'gender', 'existingConditions', 'medications', 'allergies'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSessions(prev => [newSession, ...prev]);
    // If current logged-in doctor matches this simulated patient's routed doctor (Sarah Jenkins / Cardiology), auto-select it!
    if (currentDoc?.id === 'doc-1') {
      setSelectedSession(newSession);
      setModifiedPlanSteps([]);
      showToast('⚠️ EMERGENCY ALERT: David Kim (Chest Pain) check-in active!', 'error');
    } else {
      showToast('New simulated patient added to general dashboard queue.', 'success');
    }
    setShowSimPanel(false);
  };

  // Simulate generic pediatric triage session
  const handleSimulatePediatric = () => {
    const mockId = `sim-session-${Date.now()}`;
    const newSession: IntakeSession = {
      id: mockId,
      patientId: `sim-pat-${Date.now()}`,
      phase: 'complete',
      profile: {
        name: 'Tommy Miller',
        age: 6,
        gender: 'Male',
        existingConditions: ['Asthma'],
        medications: ['Albuterol Inhaler'],
        allergies: ['Peanuts']
      },
      symptoms: {
        symptoms: ['high fever', 'lethargy'],
        duration: '1 day',
        severity: 'high'
      },
      messages: [
        { role: 'user', content: 'Tommy is 6 and has a high fever of 103 and is very lethargic', timestamp: new Date().toISOString() }
      ],
      structuredIntake: {
        symptoms: ['high fever', 'lethargy'],
        duration: '1 day',
        severity: 'high',
        recommended_department: 'General Medicine',
        urgency: 'urgent',
        possible_concerns: ['Pediatric Infection', 'Dehydration'],
        red_flags_detected: ['high fever with lethargy']
      },
      triage: {
        urgency: 'urgent',
        department: 'General Medicine',
        redFlags: ['high fever with lethargy'],
        reasoning: 'Pediatric patient under 10 presenting with sudden fever spikes and severe lethargy.',
        safetyOverride: false
      },
      clinicianHandoff: {
        summary: '6-year-old male with history of asthma presenting with 103F pediatric fever and severe lethargy for 1 day. High risk of systemic infection; urgent general clinical triage recommended.',
        symptoms: ['high fever', 'lethargy'],
        severity: 'high',
        possibleConcerns: ['Acute Pediatric Infection', 'Sepsis screening'],
        recommendedActions: [
          `Specialist: Dr. Robert Chen (Family & Internal Medicine)`,
          `Location: Floor 1, Room 102 (Building A, Ground Floor)`,
          'Slot: In 15 minutes',
          'Priority: URGENT'
        ],
        department: 'General Medicine',
        urgency: 'urgent'
      },
      doctorSuggestion: {
        doctorId: 'doc-9', // Robert Chen (General Medicine)
        doctorName: 'Dr. Robert Chen',
        specialty: 'Family & Internal Medicine',
        department: 'General Medicine',
        floor: 1,
        room: '102',
        hospitalLocation: 'Building A, Ground Floor',
        appointmentTime: 'In 15 mins',
        infoSentToDoctor: true
      },
      fieldsCollected: ['name', 'age', 'gender', 'existingConditions', 'medications', 'allergies'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSessions(prev => [newSession, ...prev]);
    if (currentDoc?.id === 'doc-9') {
      setSelectedSession(newSession);
      setModifiedPlanSteps([]);
      showToast('⚠️ ALERT: Tommy Miller (Pediatric Fever) check-in active!', 'error');
    } else {
      showToast('Simulated pediatric patient Tommy Miller added to general queue.', 'success');
    }
    setShowSimPanel(false);
  };

  // If not authenticated at all, show login gate
  if (!authUser) {
    return <LoginGate onLogin={handleAuthLogin} />;
  }

  // If admin, show admin console
  if (authUser.role === 'admin') {
    return <AdminConsole user={authUser} onLogout={handleLogout} />;
  }

  // If doctor but profile not loaded yet
  if (!currentDoc) {
    return (
      <div className="max-w-md mx-auto my-16 text-center text-slate-500">
        <div className="animate-pulse text-sm font-bold">Loading clinical workspace...</div>
      </div>
    );
  }

  // Filter sessions scoped to logged-in Doctor's department
  const docPatients = sessions.filter((s) =>
    s.triage?.department === currentDoc.department ||
    s.doctorSuggestion?.doctorId === currentDoc.id
  );

  // Statistics calculation for the doctor's patients
  const urgencyCounts = docPatients.reduce((acc: Record<string, number>, s) => {
    if (s.triage?.urgency) {
      acc[s.triage.urgency] = (acc[s.triage.urgency] || 0) + 1;
    }
    return acc;
  }, {});

  const urgencyChartData = Object.entries(urgencyCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Demographics (Age groups)
  const ageBuckets = { 'Under 18': 0, '18 - 35': 0, '36 - 55': 0, '56+': 0 };
  docPatients.forEach((p) => {
    const age = Number(p.profile?.age);
    if (!age) return;
    if (age < 18) ageBuckets['Under 18']++;
    else if (age <= 35) ageBuckets['18 - 35']++;
    else if (age <= 55) ageBuckets['36 - 55']++;
    else ageBuckets['56+']++;
  });

  const ageChartData = Object.entries(ageBuckets).map(([name, value]) => ({
    name,
    value,
  }));

  const totalPatients = docPatients.length;
  const criticalCount = docPatients.filter((p) => p.triage?.urgency === 'emergency' || p.triage?.urgency === 'urgent').length;
  const completedIntakes = reviewedPatients.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 relative">
      {/* Floating Custom Notification Toast */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border text-xs font-semibold ${
          toastMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-800 animate-pulse' :
          toastMessage.type === 'info' ? 'bg-sky-50 border-sky-200 text-sky-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <Info className="w-4 h-4" />
          {toastMessage.text}
        </div>
      )}

      {/* Top Header Card */}
      <div className="glass rounded-3xl p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-0 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20 shadow-md">
            <Stethoscope className="w-8 h-8 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl md:text-2xl font-black tracking-tight">{currentDoc.name}</h2>
              <span className="text-[10px] bg-indigo-500/25 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-500/35 font-bold uppercase tracking-wider">
                Workstation ACTIVE
              </span>
            </div>
            <p className="text-xs text-indigo-200 font-semibold flex items-center gap-1.5 mt-0.5">
              <Building className="w-3.5 h-3.5 text-indigo-300" /> {currentDoc.department} Clinical Lead • {currentDoc.specialty}
            </p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-500" /> Floor {currentDoc.floor}, Room {currentDoc.room} ({currentDoc.hospitalLocation})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-stretch md:self-auto flex-wrap">
          <button
            onClick={() => setShowSimPanel(true)}
            className="p-3 bg-indigo-600/80 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
            title="Open clinical simulation triggers"
          >
            <PlusCircle className="w-4 h-4" /> Simulate Check-in
          </button>
          <button
            onClick={fetchSessions}
            className="p-3 bg-white/10 hover:bg-white/25 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-white/15"
          >
            <RefreshCw className="w-4 h-4" /> Sync Registry
          </button>
          <button
            onClick={handleLogout}
            className="p-3 bg-red-650 hover:bg-red-750 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
          >
            <LogOut className="w-4 h-4" /> Exit Workstation
          </button>
        </div>
      </div>

      {/* Simulator Control Drawer Overlay */}
      {showSimPanel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" /> Clinical Simulation triggers
              </h3>
              <button onClick={() => setShowSimPanel(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium">Inject high-risk simulated patient intakes to verify the triage, routing, and real-time dashboard notifications.</p>
            <div className="grid grid-cols-1 gap-2 pt-2">
              <button
                onClick={handleSimulateEmergency}
                className="p-3 bg-red-50 hover:bg-red-100 border border-red-150 rounded-xl text-left transition flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-red-800 flex items-center gap-1">David Kim (Cardiomyopathy)</div>
                  <div className="text-[10px] text-red-600 mt-0.5">59yo M • Chest pain & sweating (EMERGENCY)</div>
                </div>
                <ChevronRight className="w-4 h-4 text-red-600" />
              </button>
              <button
                onClick={handleSimulatePediatric}
                className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-150 rounded-xl text-left transition flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-amber-800 flex items-center gap-1">Tommy Miller (Pediatric Fever)</div>
                  <div className="text-[10px] text-amber-600 mt-0.5">6yo M • 103F Fever & Severe Lethargy (URGENT)</div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600" />
              </button>
            </div>
            <div className="text-[10px] text-slate-400 text-center font-medium">David Kim automatically routes to Dr. Sarah Jenkins (Cardiology). Tommy Miller routes to Dr. Robert Chen (General Medicine).</div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-4 flex items-center gap-4 bg-white border shadow-sm transform hover:scale-101 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Total Intakes</div>
            <div className="text-2xl font-black text-slate-800 mt-0.5">{totalPatients}</div>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-4 bg-white border shadow-sm transform hover:scale-101 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0 animate-pulse">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Critical / ER</div>
            <div className="text-2xl font-black text-red-600 mt-0.5">{criticalCount}</div>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-4 bg-white border shadow-sm transform hover:scale-101 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Reviewed</div>
            <div className="text-2xl font-black text-emerald-700 mt-0.5">{completedIntakes}</div>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-4 bg-white border shadow-sm transform hover:scale-101 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Workload Status</div>
            <div className="text-sm font-black text-slate-700 mt-1 uppercase">
              {totalPatients > 5 ? 'High Demand' : totalPatients > 2 ? 'Moderate' : 'Optimal'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Patients & Clinical Timeline */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Patient queue & Clinical guideline database tabbed explorer */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass rounded-2xl p-4 bg-white border shadow-sm flex flex-col">
            {/* Tab Headers */}
            <div className="flex border-b border-slate-100 pb-2 mb-3">
              <button
                onClick={() => setActiveLeftTab('queue')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                  activeLeftTab === 'queue' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Assigned Queue ({docPatients.length})
              </button>
              <button
                onClick={() => setActiveLeftTab('guidelines')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                  activeLeftTab === 'guidelines' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                RAG Guideline Search
              </button>
            </div>

            {/* TAB CONTENT: Patient queue */}
            {activeLeftTab === 'queue' ? (
              <div>
                {loading ? (
                  <div className="text-center py-10 text-slate-450 text-xs font-bold animate-pulse">Syncing clinical queue...</div>
                ) : docPatients.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-2">
                    <Heart className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
                    <div className="text-xs font-extrabold text-slate-655">No patients assigned</div>
                    <p className="text-[10px] text-slate-400 leading-tight">Assigned intakes will automatically stream here. Use "Simulate Check-in" above to mock one.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {docPatients.map((sessionItem) => {
                      const isActive = selectedSession?.id === sessionItem.id;
                      const isReviewed = reviewedPatients.includes(sessionItem.id);
                      return (
                        <button
                          key={sessionItem.id}
                          onClick={() => {
                            setSelectedSession(sessionItem);
                            setModifiedPlanSteps(sessionItem.treatmentPlan || []);
                            setEditingPlan(false);
                          }}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                            isActive
                              ? 'bg-gradient-to-r from-indigo-50/70 to-slate-50/50 border-indigo-300 ring-1 ring-indigo-200/50 shadow-sm'
                              : 'bg-white hover:bg-slate-50 border-slate-150'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-slate-800">
                                {String(sessionItem.profile?.name || 'Anonymous')}
                              </span>
                              {isReviewed && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" title="Reviewed" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold">
                              {sessionItem.profile?.age} yrs • {sessionItem.profile?.gender}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {sessionItem.structuredIntake?.symptoms.slice(0, 2).map((s) => (
                                <span key={s} className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold uppercase tracking-wider">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {sessionItem.triage?.urgency && (
                              <UrgencyBadge level={sessionItem.triage.urgency} />
                            )}
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-0.5">
                              Slot: {sessionItem.doctorSuggestion?.appointmentTime}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* TAB CONTENT: Guidelines search Explorer */
              <div className="space-y-3">
                <form onSubmit={handleSearchGuidelines} className="relative flex gap-1.5">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search symptoms e.g. chest pain, stomach..."
                    className="flex-1 px-3 py-2 border rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow transition"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </form>

                {searchLoading ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-bold animate-pulse">Querying clinical vectors...</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-[10px] font-semibold">
                    Input a medical keyword to search indexed guidelines in Pinecone.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {searchResults.map((guide) => (
                      <div key={guide.id} className="p-3 bg-slate-50 border rounded-xl space-y-1.5 text-[11px] font-semibold text-slate-700 shadow-2xs">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-900 capitalize">{guide.symptom}</span>
                          <span className="text-[9px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">{guide.department}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 italic">Guideline: {guide.guideline}</div>
                        {guide.red_flags?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-[8px] font-bold text-red-700 uppercase">Red flags:</span>
                            {guide.red_flags.map((flag: string, fIdx: number) => (
                              <span key={fIdx} className="text-[8px] bg-red-155 text-red-800 px-1 py-0.5 rounded font-bold">{flag}</span>
                            ))}
                          </div>
                        )}
                        {guide.clarifying_questions?.length > 0 && (
                          <div className="space-y-0.5">
                            <span className="text-[8px] text-indigo-700 uppercase font-bold block">Clarifying:</span>
                            {guide.clarifying_questions.slice(0, 2).map((q: string, qIdx: number) => (
                              <div key={qIdx} className="text-[9px] text-slate-650 leading-tight">? {q}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Department Analytics Card */}
          {docPatients.length > 0 && (
            <div className="glass rounded-2xl p-4 bg-white border shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest pb-1 border-b">
                Intake Workload Analytics
              </h3>

              <div className="space-y-4">
                {/* Urgency Distribution Chart */}
                {urgencyChartData.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Urgency Profile</div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={urgencyChartData} margin={{ left: -30 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                        <YAxis tick={{ fontSize: 8 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6366f1" radius={[3, 3, 0, 0]}>
                          {urgencyChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Age Distribution Chart */}
                {ageChartData.some((c) => c.value > 0) && (
                  <div className="space-y-1 border-t pt-3">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Age Demographics</div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={ageChartData} margin={{ left: -30 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                        <YAxis tick={{ fontSize: 8 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#818cf8" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Selected Clinical Timeline & Details */}
        <div className="lg:col-span-8">
          {selectedSession ? (
            <div className="glass rounded-2xl p-6 bg-white border border-slate-150 shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-black text-slate-800 tracking-tight">
                      Clinical Intake: {selectedSession.profile?.name}
                    </h3>
                    {selectedSession.triage?.urgency && (
                      <UrgencyBadge level={selectedSession.triage.urgency} />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Admission complete • Registered: {new Date(selectedSession.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-stretch sm:self-auto">
                  <button
                    onClick={() => handlePagePatient(String(selectedSession.profile?.name), String(selectedSession.doctorSuggestion?.room))}
                    className="flex-1 sm:flex-initial py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 border border-indigo-150 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Bell className="w-3.5 h-3.5" /> Call Patient
                  </button>
                  <button
                    onClick={() => handleReviewPatient(selectedSession.id)}
                    disabled={reviewedPatients.includes(selectedSession.id)}
                    className="flex-1 sm:flex-initial py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-50 text-white disabled:text-emerald-700 border border-transparent disabled:border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> {reviewedPatients.includes(selectedSession.id) ? 'Clinical Accepted' : 'Accept Intake'}
                  </button>
                </div>
              </div>

              {/* Patient Intake Context Details */}
              <div className="grid sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                {/* Profile Card */}
                <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                    <User className="w-3.5 h-3.5 text-slate-500" /> Patient Background
                  </h4>
                  <div className="space-y-1">
                    <div><span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider">Age / Gender:</span> {selectedSession.profile?.age} yrs / {selectedSession.profile?.gender}</div>
                    <div>
                      <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider mt-1">Existing Conditions:</span>{' '}
                      {selectedSession.profile?.existingConditions?.length
                        ? selectedSession.profile.existingConditions.join(', ')
                        : 'None reported'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider mt-1">Medications:</span>{' '}
                      {selectedSession.profile?.medications?.length
                        ? selectedSession.profile.medications.join(', ')
                        : 'None reported'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider mt-1">Allergies:</span>{' '}
                      {selectedSession.profile?.allergies?.length
                        ? selectedSession.profile.allergies.join(', ')
                        : 'None reported'}
                    </div>
                  </div>
                </div>

                {/* Intake Symptoms */}
                <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                    <Stethoscope className="w-3.5 h-3.5 text-slate-500" /> Symptom Overview
                  </h4>
                  <div className="space-y-1">
                    <div>
                      <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider">Urgency Level:</span>{' '}
                      <span className="font-extrabold capitalize text-indigo-750">{selectedSession.triage?.urgency}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider mt-1">Reported Severity:</span>{' '}
                      <span className="font-semibold capitalize text-slate-800">{selectedSession.structuredIntake?.severity || 'Medium'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider mt-1">Symptom Duration:</span>{' '}
                      <span>{selectedSession.structuredIntake?.duration || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider mt-1">Assigned Clinic Slot:</span>{' '}
                      <span className="font-extrabold">{selectedSession.doctorSuggestion?.appointmentTime}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gemini Professional Clinician Handoff */}
              {selectedSession.clinicianHandoff && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" /> GenAI Clinician Handoff Note
                  </h4>
                  <div className="p-4 bg-indigo-50/20 border border-indigo-100 rounded-2xl relative">
                    <p className="text-xs text-slate-800 leading-relaxed font-sans select-all">
                      {selectedSession.clinicianHandoff.summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Interactive AI Treatment Plan Generator Panel */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> AI-Generated Treatment Recommendations
                </h4>

                {generatingPlan ? (
                  /* Stunning Pulsing skeleton loader */
                  <div className="p-4 bg-slate-50 border rounded-2xl space-y-3 animate-pulse">
                    <div className="text-xs text-indigo-700 font-extrabold animate-bounce flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" /> CareAssist engine formulating action pathway...
                    </div>
                    <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                    <div className="h-3 bg-slate-200 rounded w-4/5"></div>
                    <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                  </div>
                ) : selectedSession.treatmentPlan ? (
                  /* Treatment plan display with dynamic clinical modifications */
                  <div className="p-4 bg-indigo-50/30 border border-indigo-150 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> GenAI Clinical Steps Active
                      </span>
                      {editingPlan ? (
                        <button
                          onClick={handleSavePlanEdits}
                          className="text-[10px] text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-bold"
                        >
                          <Save className="w-3.5 h-3.5" /> Save Plan
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingPlan(true)}
                          className="text-[10px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-bold"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Modify recommendations
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {modifiedPlanSteps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 text-[10px]">
                            {idx + 1}
                          </span>
                          {editingPlan ? (
                            <input
                              type="text"
                              value={step}
                              onChange={(e) => {
                                const newSteps = [...modifiedPlanSteps];
                                newSteps[idx] = e.target.value;
                                setModifiedPlanSteps(newSteps);
                              }}
                              className="flex-1 px-2 py-1 border rounded-lg text-xs"
                            />
                          ) : (
                            <span className="leading-snug pt-0.5">{step}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="text-[9px] text-slate-450 italic leading-tight pt-1">
                      ⚠️ Note: Treatment instructions generated by CareAssist AI are clinicians-only guidance tools. The reviewing physician holds final accountability for prescription & discharge protocols.
                    </div>
                  </div>
                ) : (
                  /* Button triggers Gemini API plan generation */
                  <div className="text-center p-6 border border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
                    <p className="text-xs text-slate-500 font-semibold">Generate a custom clinical action pathway based on symptoms & health metrics.</p>
                    <button
                      onClick={handleGeneratePlan}
                      className="px-4 py-2 bg-gradient-to-r from-care-600 to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:from-care-700 hover:to-indigo-850 flex items-center gap-1.5 mx-auto active:scale-98 transition transform duration-200"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-200" /> Synthesize Patient Action Steps
                    </button>
                  </div>
                )}
              </div>

              {/* Structured Possible Concerns */}
              {selectedSession.structuredIntake?.possible_concerns && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-widest text-slate-500">
                    Assessed Clinical Concerns
                  </h4>
                  <ul className="grid sm:grid-cols-2 gap-1.5 text-xs text-slate-700 font-semibold">
                    {selectedSession.structuredIntake.possible_concerns.map((c, i) => (
                      <li key={i} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conversation Transcript Logs */}
              <div className="space-y-2 border-t pt-4">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-widest text-slate-500">
                  Intake Interview Transcript
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 text-xs font-semibold">
                  {selectedSession.messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl max-w-[85%] ${
                        m.role === 'user'
                          ? 'bg-slate-100 text-slate-800 ml-auto'
                          : 'bg-indigo-50/40 text-indigo-950'
                      }`}
                    >
                      <div className="font-black text-[8px] uppercase tracking-widest text-slate-400 mb-0.5">
                        {m.role === 'user' ? 'Patient' : 'CareAssist AI'}
                      </div>
                      <div className="leading-relaxed whitespace-pre-line">{m.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center text-slate-500 space-y-3 bg-white h-full flex flex-col items-center justify-center border shadow-sm">
              <Stethoscope className="w-12 h-12 text-slate-350 animate-pulse" />
              <div className="font-extrabold text-slate-700 text-xs uppercase tracking-widest">practitioner station awaiting patient selection</div>
              <p className="text-xs text-slate-450 max-w-sm mx-auto leading-tight">Select an active patient check-in timeline from the queue on the left to analyze intake files, GenAI notes, and trigger AI treatment recommendations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
