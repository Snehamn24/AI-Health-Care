import { Routes, Route, NavLink } from 'react-router-dom';
import { Activity, BarChart3, MessageCircle, Stethoscope } from 'lucide-react';
import IntakePage from './pages/IntakePage';
import DashboardPage from './pages/DashboardPage';
import ArchitecturePage from './pages/ArchitecturePage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass sticky top-0 z-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-care-600 to-care-800 flex items-center justify-center text-white">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-care-900">CareAssist</h1>
              <p className="text-xs text-slate-500">AI Healthcare Intake & Triage</p>
            </div>
          </div>
          <nav className="flex gap-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-care-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <MessageCircle className="w-4 h-4" />
              Intake
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-care-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </NavLink>
            <NavLink
              to="/doctor-portal"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-care-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Stethoscope className="w-4 h-4" />
              Doctor Portal
            </NavLink>
            <NavLink
              to="/architecture"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-care-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Activity className="w-4 h-4" />
              Architecture
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<IntakePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="/doctor-portal" element={<DoctorDashboardPage />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        AI-powered cloud-native healthcare intake and triage orchestration — Google Cloud GenAI
        Infrastructure
      </footer>
    </div>
  );
}

export default App;
