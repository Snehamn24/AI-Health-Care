import { useNavigate } from 'react-router-dom';
import { MessageSquare, Stethoscope, ShieldAlert, Activity, Heart, ArrowRight } from 'lucide-react';

export default function HomePortalPage() {
  const navigate = useNavigate();

  const portals = [
    {
      title: '01_Patient_AI',
      name: 'Patient Intake & Triage',
      desc: 'Start a secure AI-guided conversational medical registration and triage session. Describe your clinical symptoms and get automatically routed to the proper hospital clinic.',
      icon: <MessageSquare className="w-8 h-8 text-emerald-600 animate-pulse" />,
      color: 'from-emerald-500/10 via-teal-500/5 to-transparent',
      borderColor: 'hover:border-emerald-300 ring-emerald-400/20',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100',
      badge: 'SELF CHECK-IN',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      target: '/intake',
    },
    {
      title: '03_Doctor_Portal',
      name: 'Clinical Workstation',
      desc: 'Authorized clinical staff workspace. View real-time assigned patient triage streams, consult AI-synthesized action pathways, page patients, and search RAG-indexed guidelines.',
      icon: <Stethoscope className="w-8 h-8 text-blue-600" />,
      color: 'from-blue-500/10 via-indigo-500/5 to-transparent',
      borderColor: 'hover:border-blue-300 ring-blue-400/20',
      btnBg: 'bg-blue-600 hover:bg-blue-700 shadow-blue-100',
      badge: 'PHYSICIANS ONLY',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      target: '/doctor-portal',
    },
    {
      title: '02_Admin_Routing',
      name: 'Medicare Operations Console',
      desc: 'Full systems dashboard. View live platform traffic charts, review historical patient routing requests, dynamically add clinical departments or register new staff, and manage safety controls.',
      icon: <ShieldAlert className="w-8 h-8 text-violet-600" />,
      color: 'from-violet-500/10 via-purple-500/5 to-transparent',
      borderColor: 'hover:border-violet-300 ring-violet-400/20',
      btnBg: 'bg-violet-600 hover:bg-violet-700 shadow-violet-100',
      badge: 'ADMINISTRATORS',
      badgeColor: 'bg-violet-100 text-violet-800 border-violet-200',
      target: '/dashboard',
    },
  ];

  return (
    <div className="min-h-[85vh] bg-gradient-to-tr from-slate-50 via-indigo-50/20 to-slate-50 py-12 px-4 flex flex-col justify-center items-center">
      {/* Background Micro Decorative blobs */}
      <div className="absolute top-1/4 left-1/10 w-72 h-72 bg-blue-300/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-indigo-300/10 rounded-full blur-3xl -z-10" />

      {/* Main Title Section */}
      <div className="max-w-4xl text-center space-y-4 mb-16 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-700 text-xs font-bold uppercase tracking-wider">
          <Activity className="w-3.5 h-3.5 animate-spin text-indigo-600" />
          CareAssist Health Platform
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight leading-none">
          Unified Healthcare Intake & <span className="bg-clip-text text-transparent bg-gradient-to-r from-care-600 to-indigo-600">Triage Orchestration</span>
        </h1>
        <p className="max-w-2xl mx-auto text-base text-slate-550 font-semibold leading-relaxed">
          Select a gateway below to start the conversational check-in, load a physician workspace, or access global administrative system analytics.
        </p>
      </div>

      {/* Portals Cards Grid */}
      <div className="max-w-6xl w-full grid md:grid-cols-3 gap-8">
        {portals.map((p, index) => (
          <div
            key={index}
            className={`glass group rounded-3xl p-6 border border-slate-200/80 bg-white/70 shadow-sm hover:shadow-xl hover:scale-103 hover:bg-white transition-all duration-300 transform flex flex-col justify-between space-y-6 ${p.borderColor}`}
          >
            <div className="space-y-4">
              {/* Header Tickers */}
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                  {p.title}
                </span>
                <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border tracking-wide uppercase ${p.badgeColor}`}>
                  {p.badge}
                </span>
              </div>

              {/* Decorative Circle Icon Wrapper */}
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                {p.icon}
              </div>

              {/* Title & Desc */}
              <div className="space-y-2">
                <h3 className="font-display font-black text-xl text-slate-800 group-hover:text-care-700 transition-colors">
                  {p.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  {p.desc}
                </p>
              </div>
            </div>

            {/* CTA Trigger */}
            <div className="pt-2">
              <button
                onClick={() => navigate(p.target)}
                className={`w-full py-3 rounded-2xl text-xs font-extrabold text-white flex items-center justify-center gap-1.5 transition-all shadow-md ${p.btnBg}`}
              >
                Enter Gateway <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Branding Notes */}
      <div className="mt-16 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
        <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> Powered by Google Cloud GenAI & Advanced Clinical Vectors
      </div>
    </div>
  );
}
