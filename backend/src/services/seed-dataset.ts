import { v4 as uuidv4 } from 'uuid';
import {
  dbInsertDoctor, dbInsertPatient, dbAddDepartment,
  dbGetDoctors, dbInsertSession,
  dbDepartmentExists, dbGetPatientByPhone, db
} from './database.js';

/**
 * Seeds the SQLite database with a realistic medical dataset on first run.
 * Includes departments, doctors with credentials, 50+ patients, and sample sessions.
 */
export function seedDatabase(): void {
  // ─── 1. Seed Departments ───
  const depts = [
    'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics',
    'Pulmonology', 'Dermatology', 'ENT', 'Psychiatry',
    'Emergency Care', 'Pediatrics', 'Gastroenterology', 'Oncology'
  ];
  for (const d of depts) {
    if (!dbDepartmentExists(d)) dbAddDepartment(d);
  }

  // ─── 2. Seed Doctors ───
  const existingDocs = dbGetDoctors();
  if (existingDocs.length === 0) {
    const doctors = [
      { id: 'doc-1', name: 'Dr. Sarah Jenkins', department: 'Cardiology', specialty: 'Interventional Cardiology', floor: 3, room: '305', hospital_location: 'Building C, Wing 3', username: 'sarah', password: 'password', availability_status: 'available' },
      { id: 'doc-2', name: 'Dr. Alan Turing', department: 'Neurology', specialty: 'Clinical Neurology & Neurogenetics', floor: 4, room: '412', hospital_location: 'Building B, Wing 4', username: 'alan', password: 'password', availability_status: 'available' },
      { id: 'doc-3', name: 'Dr. Marcus Welby', department: 'Orthopedics', specialty: 'Orthopedic Surgery & Joint Reconstruction', floor: 2, room: '204', hospital_location: 'Building A, Wing 2', username: 'marcus', password: 'password', availability_status: 'available' },
      { id: 'doc-4', name: 'Dr. Elizabeth Blackwell', department: 'Pulmonology', specialty: 'Pulmonary & Critical Care Medicine', floor: 3, room: '318', hospital_location: 'Building C, Wing 3', username: 'elizabeth', password: 'password', availability_status: 'available' },
      { id: 'doc-5', name: 'Dr. Gregory House', department: 'Dermatology', specialty: 'Clinical Dermatology & Diagnostic Pathology', floor: 2, room: '221', hospital_location: 'Building B, Wing 2', username: 'gregory', password: 'password', availability_status: 'available' },
      { id: 'doc-6', name: 'Dr. Fiona Gallagher', department: 'ENT', specialty: 'Otolaryngology & Throat Care', floor: 1, room: '145', hospital_location: 'Building A, Wing 1', username: 'fiona', password: 'password', availability_status: 'available' },
      { id: 'doc-7', name: 'Dr. Sigmund Freud', department: 'Psychiatry', specialty: 'Clinical Psychiatry & Psychotherapy', floor: 5, room: '501', hospital_location: 'Building D, Wing 5', username: 'sigmund', password: 'password', availability_status: 'available' },
      { id: 'doc-8', name: 'Dr. John Carter', department: 'Emergency Care', specialty: 'Emergency Medicine & Trauma', floor: 1, room: 'ER-1', hospital_location: 'Emergency Care Pavilion, Ground Floor', username: 'john', password: 'password', availability_status: 'available' },
      { id: 'doc-9', name: 'Dr. Robert Chen', department: 'General Medicine', specialty: 'Family & Internal Medicine', floor: 1, room: '102', hospital_location: 'Building A, Ground Floor', username: 'robert', password: 'password', availability_status: 'available' },
      { id: 'doc-10', name: 'Dr. Emily Torres', department: 'Pediatrics', specialty: 'Pediatric General Medicine', floor: 2, room: '210', hospital_location: 'Building A, Wing 2', username: 'emily', password: 'password', availability_status: 'available' },
      { id: 'doc-11', name: 'Dr. Michael Chen', department: 'Gastroenterology', specialty: 'Hepatology & GI Disorders', floor: 3, room: '330', hospital_location: 'Building C, Wing 3', username: 'michael', password: 'password', availability_status: 'available' },
      { id: 'doc-12', name: 'Dr. Robert Fox', department: 'Oncology', specialty: 'Medical Oncology & Hematology', floor: 5, room: '505', hospital_location: 'Building D, Wing 5', username: 'fox', password: 'password', availability_status: 'available' },
    ];
    for (const doc of doctors) {
      dbInsertDoctor(doc);
    }
  }

  // ─── 3. Seed Patients (50+ records) ───
  const samplePatients = [
    { name: 'Aarav Patel', phone: '9876543210', age: 34, gender: 'Male', conditions: ['Type 2 Diabetes'], meds: ['Metformin'], allergies: [] },
    { name: 'Priya Sharma', phone: '9876543211', age: 28, gender: 'Female', conditions: [], meds: [], allergies: ['Penicillin'] },
    { name: 'Rahul Gupta', phone: '9876543212', age: 52, gender: 'Male', conditions: ['Hypertension', 'High Cholesterol'], meds: ['Lisinopril', 'Atorvastatin'], allergies: [] },
    { name: 'Meera Reddy', phone: '9876543213', age: 45, gender: 'Female', conditions: ['Asthma'], meds: ['Albuterol Inhaler'], allergies: ['Sulfa Drugs'] },
    { name: 'Vikram Singh', phone: '9876543214', age: 67, gender: 'Male', conditions: ['Coronary Artery Disease', 'Atrial Fibrillation'], meds: ['Warfarin', 'Metoprolol'], allergies: [] },
    { name: 'Ananya Iyer', phone: '9876543215', age: 22, gender: 'Female', conditions: [], meds: [], allergies: [] },
    { name: 'Karthik Nair', phone: '9876543216', age: 40, gender: 'Male', conditions: ['Gastric Reflux'], meds: ['Omeprazole'], allergies: ['Aspirin'] },
    { name: 'Sneha Menon', phone: '9876543217', age: 31, gender: 'Female', conditions: ['Migraine'], meds: ['Sumatriptan'], allergies: [] },
    { name: 'Arjun Deshmukh', phone: '9876543218', age: 58, gender: 'Male', conditions: ['Type 2 Diabetes', 'Hypertension'], meds: ['Insulin', 'Amlodipine'], allergies: ['Ibuprofen'] },
    { name: 'Divya Krishnan', phone: '9876543219', age: 36, gender: 'Female', conditions: ['Hypothyroidism'], meds: ['Levothyroxine'], allergies: [] },
    { name: 'Thomas Henderson', phone: '9876543220', age: 52, gender: 'Male', conditions: ['Hypertension'], meds: ['Lisinopril'], allergies: [] },
    { name: 'Linda Kim', phone: '9876543221', age: 68, gender: 'Female', conditions: ['Hypertension', 'Heart Failure'], meds: ['Furosemide', 'Enalapril'], allergies: ['Penicillin'] },
    { name: 'David Kim', phone: '9876543222', age: 45, gender: 'Male', conditions: ['COPD'], meds: ['Tiotropium'], allergies: [] },
    { name: 'Marcus Johnson', phone: '9876543223', age: 45, gender: 'Male', conditions: ['Arrhythmia'], meds: ['Amiodarone'], allergies: [] },
    { name: 'Eleanor Ross', phone: '9876543224', age: 62, gender: 'Female', conditions: ['Hypertension'], meds: ['Losartan'], allergies: [] },
    { name: 'Robert Palmer', phone: '9876543225', age: 58, gender: 'Male', conditions: ['Post-CABG'], meds: ['Aspirin', 'Clopidogrel'], allergies: [] },
    { name: 'Maria Santos', phone: '9876543226', age: 71, gender: 'Female', conditions: ['Heart Failure', 'Diabetes'], meds: ['Metformin', 'Spironolactone'], allergies: ['Sulfa Drugs'] },
    { name: 'James Wilson', phone: '9876543227', age: 55, gender: 'Male', conditions: ['Chronic Back Pain'], meds: ['Tramadol'], allergies: [] },
    { name: 'Sarah Williams', phone: '9876543228', age: 48, gender: 'Female', conditions: ['Mitral Valve Prolapse'], meds: ['Propranolol'], allergies: [] },
    { name: 'David Lee', phone: '9876543229', age: 55, gender: 'Male', conditions: ['Hyperlipidemia'], meds: ['Rosuvastatin'], allergies: [] },
    { name: 'Alice Peterson', phone: '9876543230', age: 34, gender: 'Female', conditions: [], meds: [], allergies: [] },
    { name: 'Tommy Miller', phone: '9876543231', age: 6, gender: 'Male', conditions: ['Childhood Asthma'], meds: ['Albuterol'], allergies: ['Peanuts'] },
    { name: 'Ravi Kumar', phone: '9876543232', age: 43, gender: 'Male', conditions: ['Peptic Ulcer'], meds: ['Pantoprazole'], allergies: [] },
    { name: 'Lakshmi Bhat', phone: '9876543233', age: 56, gender: 'Female', conditions: ['Rheumatoid Arthritis'], meds: ['Methotrexate'], allergies: ['NSAIDs'] },
    { name: 'Suresh Rao', phone: '9876543234', age: 70, gender: 'Male', conditions: ['COPD', 'Diabetes'], meds: ['Insulin', 'Ipratropium'], allergies: [] },
    { name: 'Kavitha Pillai', phone: '9876543235', age: 29, gender: 'Female', conditions: ['Iron Deficiency Anemia'], meds: ['Ferrous Sulfate'], allergies: [] },
    { name: 'Mohan Das', phone: '9876543236', age: 65, gender: 'Male', conditions: ['Benign Prostatic Hyperplasia'], meds: ['Tamsulosin'], allergies: [] },
    { name: 'Anjali Verma', phone: '9876543237', age: 38, gender: 'Female', conditions: ['Anxiety Disorder'], meds: ['Escitalopram'], allergies: [] },
    { name: 'Deepak Joshi', phone: '9876543238', age: 47, gender: 'Male', conditions: ['Gout'], meds: ['Allopurinol'], allergies: ['Codeine'] },
    { name: 'Fatima Sheikh', phone: '9876543239', age: 33, gender: 'Female', conditions: ['Polycystic Ovary Syndrome'], meds: ['Metformin'], allergies: [] },
    { name: 'Rajesh Agarwal', phone: '9876543240', age: 60, gender: 'Male', conditions: ['Chronic Kidney Disease Stage 3'], meds: ['Losartan'], allergies: ['Contrast Dye'] },
    { name: 'Nandini Rao', phone: '9876543241', age: 25, gender: 'Female', conditions: [], meds: [], allergies: ['Latex'] },
    { name: 'Sanjay Mehta', phone: '9876543242', age: 49, gender: 'Male', conditions: ['Sleep Apnea'], meds: [], allergies: [] },
    { name: 'Pooja Sinha', phone: '9876543243', age: 42, gender: 'Female', conditions: ['Depression'], meds: ['Sertraline'], allergies: [] },
    { name: 'Anil Kapoor', phone: '9876543244', age: 73, gender: 'Male', conditions: ['Parkinson Disease'], meds: ['Levodopa'], allergies: [] },
    { name: 'Sunita Devi', phone: '9876543245', age: 50, gender: 'Female', conditions: ['Osteoporosis'], meds: ['Alendronate'], allergies: [] },
    { name: 'Ganesh Iyer', phone: '9876543246', age: 35, gender: 'Male', conditions: ['Seasonal Allergies'], meds: ['Cetirizine'], allergies: [] },
    { name: 'Rekha Bose', phone: '9876543247', age: 61, gender: 'Female', conditions: ['Atrial Fibrillation'], meds: ['Apixaban', 'Diltiazem'], allergies: ['Penicillin'] },
    { name: 'Harish Chandra', phone: '9876543248', age: 54, gender: 'Male', conditions: ['Hepatitis B'], meds: ['Entecavir'], allergies: [] },
    { name: 'Yamuna Deshpande', phone: '9876543249', age: 27, gender: 'Female', conditions: [], meds: [], allergies: ['Shellfish'] },
    { name: 'Prakash Shetty', phone: '9876543250', age: 66, gender: 'Male', conditions: ['Diabetic Neuropathy'], meds: ['Gabapentin', 'Metformin'], allergies: [] },
    { name: 'Lalitha Subramanian', phone: '9876543251', age: 44, gender: 'Female', conditions: ['Fibromyalgia'], meds: ['Duloxetine'], allergies: [] },
    { name: 'Omar Khan', phone: '9876543252', age: 39, gender: 'Male', conditions: ['Irritable Bowel Syndrome'], meds: ['Dicyclomine'], allergies: [] },
    { name: 'Geeta Malhotra', phone: '9876543253', age: 57, gender: 'Female', conditions: ['Hypothyroidism', 'Hypertension'], meds: ['Levothyroxine', 'Amlodipine'], allergies: [] },
    { name: 'Vivek Trivedi', phone: '9876543254', age: 30, gender: 'Male', conditions: [], meds: [], allergies: ['Dust Mites'] },
    { name: 'Radha Krishnamurthy', phone: '9876543255', age: 72, gender: 'Female', conditions: ['Chronic Heart Failure', 'Diabetes'], meds: ['Furosemide', 'Insulin'], allergies: ['ACE Inhibitors'] },
    { name: 'Amit Shah', phone: '9876543256', age: 41, gender: 'Male', conditions: ['Psoriasis'], meds: ['Adalimumab'], allergies: [] },
    { name: 'Bhavna Puri', phone: '9876543257', age: 53, gender: 'Female', conditions: ['Lupus'], meds: ['Hydroxychloroquine'], allergies: ['Sulfa Drugs'] },
    { name: 'Nitin Kulkarni', phone: '9876543258', age: 46, gender: 'Male', conditions: ['Epilepsy'], meds: ['Valproate'], allergies: [] },
    { name: 'Swati Jain', phone: '9876543259', age: 37, gender: 'Female', conditions: ['Endometriosis'], meds: ['Norethindrone'], allergies: [] },
  ];

  for (const p of samplePatients) {
    const existing = dbGetPatientByPhone(p.phone);
    if (!existing) {
      dbInsertPatient({
        id: uuidv4(),
        name: p.name,
        phone: p.phone,
        age: p.age,
        gender: p.gender,
        existing_conditions: JSON.stringify(p.conditions),
        medications: JSON.stringify(p.meds),
        allergies: JSON.stringify(p.allergies),
      });
    }
  }

  // ─── 4. Seed Sample Sessions (15 completed intake records) ───
  const existingSessions = (db.prepare('SELECT COUNT(*) as c FROM sessions').get() as any).c;
  if (existingSessions === 0) {
    const sessionSeeds = [
      { patientName: 'Thomas Henderson', symptoms: ['chest pain', 'sweating'], severity: 'high', dept: 'Cardiology', urgency: 'emergency' as const, redFlags: ['chest pain with sweating'], status: 'approved' },
      { patientName: 'Linda Kim', symptoms: ['chest pain radiating to jaw'], severity: 'high', dept: 'Cardiology', urgency: 'emergency' as const, redFlags: ['chest pain radiating'], status: 'approved' },
      { patientName: 'Marcus Johnson', symptoms: ['palpitations', 'dizziness'], severity: 'medium', dept: 'Cardiology', urgency: 'urgent' as const, redFlags: [], status: 'approved' },
      { patientName: 'Aarav Patel', symptoms: ['frequent urination', 'fatigue'], severity: 'medium', dept: 'General Medicine', urgency: 'medium' as const, redFlags: [], status: 'approved' },
      { patientName: 'Sneha Menon', symptoms: ['severe headache', 'visual aura'], severity: 'high', dept: 'Neurology', urgency: 'urgent' as const, redFlags: ['sudden severe headache'], status: 'pending' },
      { patientName: 'James Wilson', symptoms: ['lower back pain', 'numbness in legs'], severity: 'medium', dept: 'Orthopedics', urgency: 'medium' as const, redFlags: [], status: 'approved' },
      { patientName: 'Tommy Miller', symptoms: ['wheezing', 'shortness of breath'], severity: 'high', dept: 'Pediatrics', urgency: 'urgent' as const, redFlags: ['pediatric respiratory distress'], status: 'pending' },
      { patientName: 'Meera Reddy', symptoms: ['persistent cough', 'chest tightness'], severity: 'medium', dept: 'Pulmonology', urgency: 'medium' as const, redFlags: [], status: 'approved' },
      { patientName: 'David Kim', symptoms: ['acute breathing difficulty', 'wheezing'], severity: 'high', dept: 'Emergency Care', urgency: 'emergency' as const, redFlags: ['acute respiratory distress'], status: 'approved' },
      { patientName: 'Karthik Nair', symptoms: ['abdominal pain', 'acid reflux'], severity: 'medium', dept: 'Gastroenterology', urgency: 'medium' as const, redFlags: [], status: 'pending' },
      { patientName: 'Anjali Verma', symptoms: ['panic attacks', 'insomnia'], severity: 'medium', dept: 'Psychiatry', urgency: 'medium' as const, redFlags: [], status: 'approved' },
      { patientName: 'Priya Sharma', symptoms: ['sore throat', 'difficulty swallowing'], severity: 'low', dept: 'ENT', urgency: 'low' as const, redFlags: [], status: 'pending' },
      { patientName: 'Amit Shah', symptoms: ['skin rash', 'itching'], severity: 'low', dept: 'Dermatology', urgency: 'low' as const, redFlags: [], status: 'approved' },
      { patientName: 'Eleanor Ross', symptoms: ['elevated blood pressure', 'headache'], severity: 'medium', dept: 'Cardiology', urgency: 'urgent' as const, redFlags: [], status: 'pending' },
      { patientName: 'Vikram Singh', symptoms: ['chest discomfort', 'fatigue on exertion'], severity: 'high', dept: 'Cardiology', urgency: 'urgent' as const, redFlags: ['exertional chest pain'], status: 'pending' },
    ];

    const daysAgo = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d.toISOString();
    };

    for (let i = 0; i < sessionSeeds.length; i++) {
      const s = sessionSeeds[i];
      const created = daysAgo(sessionSeeds.length - i);
      dbInsertSession({
        id: `seed-session-${i + 1}`,
        patient_id: null,
        phase: 'complete',
        profile_json: JSON.stringify({ name: s.patientName }),
        symptoms_json: JSON.stringify({ symptoms: s.symptoms, severity: s.severity, duration: `${Math.floor(Math.random() * 5) + 1} days` }),
        messages_json: JSON.stringify([
          { role: 'assistant', content: `Hello! I am your AI healthcare intake assistant. How can I help you today?`, timestamp: created },
          { role: 'user', content: `I have been experiencing ${s.symptoms.join(' and ')}`, timestamp: created },
          { role: 'assistant', content: `I understand you are experiencing ${s.symptoms.join(', ')}. Let me collect some information and route you to the right department.`, timestamp: created },
        ]),
        structured_intake_json: JSON.stringify({
          symptoms: s.symptoms,
          severity: s.severity,
          duration: `${Math.floor(Math.random() * 5) + 1} days`,
          recommended_department: s.dept,
          urgency: s.urgency,
          possible_concerns: s.symptoms.map((sym: string) => `Evaluate ${sym}`),
          red_flags_detected: s.redFlags,
        }),
        triage_json: JSON.stringify({
          urgency: s.urgency,
          department: s.dept,
          redFlags: s.redFlags,
          reasoning: `AI analysis: ${s.symptoms.join(', ')} → routed to ${s.dept}`,
          safetyOverride: s.urgency === 'emergency',
        }),
        clinician_handoff_json: JSON.stringify({
          summary: `Patient ${s.patientName} presents with ${s.symptoms.join(', ')}. Severity: ${s.severity}. Recommended department: ${s.dept}.`,
          symptoms: s.symptoms,
          severity: s.severity,
          possibleConcerns: s.symptoms.map((sym: string) => `Investigate ${sym}`),
          recommendedActions: [`Schedule ${s.dept} consultation`, 'Monitor vital signs', 'Review medication interactions'],
          department: s.dept,
          urgency: s.urgency,
        }),
        doctor_suggestion_json: null,
        treatment_plan_json: null,
        fields_collected_json: JSON.stringify(['name']),
        approval_status: s.status,
        doctor_viewed: 0,
        doctor_viewed_at: null,
        prescription_json: null,
        clinical_notes_json: null,
        created_at: created,
        updated_at: created,
      });
    }
  }

  console.log('[SEED] Database seeded successfully with medical dataset.');
}
