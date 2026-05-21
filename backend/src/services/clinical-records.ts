import { db } from './database.js';

// ─── Interfaces ───

export interface EmergencyCase {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  department: string;
  urgency: 'emergency' | 'urgent';
  reason: string;
  status: string;
  vitalsTransmitted: 'Yes' | 'No';
  roomPrepared: string;
  etaMinutes: number;
  vitals: {
    bloodPressure: string;
    heartRate: number;
    oxygenSaturation: number;
    temperature: string;
  };
}

export interface AppointmentRecord {
  id: string;
  time: string;
  patientName: string;
  age: number;
  type: string;
  priority: 'High Priority' | 'Routine';
  status: 'Checked In' | 'Waiting' | 'Scheduled';
  department: string;
}

export interface PatientRecordCard {
  id: string;
  name: string;
  age: number;
  gender: string;
  condition: string;
  lastVisit: string;
  priority: 'High Priority' | 'Routine';
  department: string;
}

export interface FollowUpTask {
  id: string;
  patientName: string;
  type: 'AI Managed' | 'Manual';
  description: string;
  dueDate: string;
  priority: 'High Priority' | 'Routine';
  department: string;
}

// ─── SQLite table for clinical records ───

db.exec(`
  CREATE TABLE IF NOT EXISTS emergencies (
    id TEXT PRIMARY KEY,
    name TEXT, age INTEGER, gender TEXT, department TEXT,
    urgency TEXT, reason TEXT, status TEXT,
    vitals_transmitted TEXT, room_prepared TEXT, eta_minutes INTEGER,
    bp TEXT, heart_rate INTEGER, oxygen_sat INTEGER, temperature TEXT
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    time TEXT, patient_name TEXT, age INTEGER, type TEXT,
    priority TEXT, status TEXT, department TEXT
  );
  CREATE TABLE IF NOT EXISTS patient_cards (
    id TEXT PRIMARY KEY,
    name TEXT, age INTEGER, gender TEXT, condition TEXT,
    last_visit TEXT, priority TEXT, department TEXT
  );
  CREATE TABLE IF NOT EXISTS follow_ups (
    id TEXT PRIMARY KEY,
    patient_name TEXT, type TEXT, description TEXT,
    due_date TEXT, priority TEXT, department TEXT
  );
`);

// ─── Seed clinical data for ALL 12 departments ───

function seedClinicalIfEmpty() {
  const count = (db.prepare('SELECT COUNT(*) as c FROM emergencies').get() as any).c;
  if (count > 0) return;

  const insertEmg = db.prepare('INSERT OR IGNORE INTO emergencies VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const emgData = [
    // Cardiology
    ['emg-1','Thomas H.',52,'Male','Cardiology','emergency','Chest pain + sweating + breathlessness → suspected cardiac emergency','Ambulance En Route','Yes','ER-3',5,'145/95',110,92,'98.6°F'],
    ['emg-2','Linda K.',68,'Female','Cardiology','emergency','Severe chest pain radiating to jaw + history of hypertension','Ambulance En Route','Yes','ER-1',12,'160/100',105,94,'98.9°F'],
    // Emergency Care
    ['emg-3','David Kim',45,'Male','Emergency Care','emergency','Acute respiratory distress with bilateral wheezing','Admitted in Bay 2','Yes','ER-Resus-1',0,'135/88',118,89,'101.2°F'],
    // Neurology
    ['emg-4','Sneha Menon',31,'Female','Neurology','urgent','Sudden severe headache with vision changes + neck stiffness','Under Observation','Yes','Neuro-ICU',0,'150/92',98,96,'99.1°F'],
    // Pulmonology
    ['emg-5','Ravi Kumar',56,'Male','Pulmonology','emergency','Acute asthma exacerbation with severe dyspnea','Admitted in Bay 4','Yes','ER-5',0,'130/85',125,87,'98.8°F'],
    // Psychiatry
    ['emg-6','Anna Wells',29,'Female','Psychiatry','urgent','Acute anxiety crisis with hyperventilation and palpitations','Under Assessment','Yes','Psych-ER',0,'142/90',112,95,'98.4°F'],
    // Pediatrics
    ['emg-7','Tommy Miller',6,'Male','Pediatrics','urgent','High fever (103.5°F) with febrile seizure episode','Under Observation','Yes','Peds-ER',0,'90/60',140,94,'103.5°F'],
    // Orthopedics
    ['emg-8','John Baker',42,'Male','Orthopedics','urgent','Fall from height — suspected spinal compression fracture','Ambulance En Route','Yes','ER-6',8,'138/85',95,97,'98.7°F'],
    // Gastroenterology
    ['emg-9','Priya Sharma',42,'Female','Gastroenterology','urgent','Acute abdominal pain with vomiting and rigid abdomen','Under Observation','Yes','ER-7',0,'128/82',102,96,'100.8°F'],
    // ENT
    ['emg-10','Carlos Diaz',38,'Male','ENT','urgent','Severe epistaxis (nosebleed) unresponsive to pressure — suspected posterior bleed','Under Treatment','Yes','ENT-ER',0,'118/72',88,98,'98.5°F'],
    // Dermatology
    ['emg-11','Lisa Chang',33,'Female','Dermatology','urgent','Severe allergic reaction with widespread urticaria and facial swelling','Under Treatment','Yes','ER-8',0,'105/68',108,95,'99.0°F'],
    // Oncology
    ['emg-12','William Ford',65,'Male','Oncology','urgent','Tumor lysis syndrome with acute kidney injury — chemotherapy complication','ICU Transfer','Yes','Onc-ICU',0,'95/62',115,91,'101.5°F'],
    // General Medicine
    ['emg-13','Ananya Iyer',19,'Female','General Medicine','urgent','Diabetic ketoacidosis with altered sensorium','Under Treatment','Yes','ER-9',0,'100/65',120,93,'99.8°F'],
  ];
  for (const e of emgData) insertEmg.run(...e);

  const insertApt = db.prepare('INSERT OR IGNORE INTO appointments VALUES (?,?,?,?,?,?,?,?)');
  const aptData = [
    // Cardiology
    ['apt-1','11:00 AM','Marcus J.',45,'Initial Consult','High Priority','Checked In','Cardiology'],
    ['apt-2','11:30 AM','Eleanor R.',62,'Follow-up','Routine','Waiting','Cardiology'],
    ['apt-3','12:00 PM','Robert P.',58,'Consultation','Routine','Scheduled','Cardiology'],
    ['apt-4','2:00 PM','Maria S.',71,'Follow-up','High Priority','Scheduled','Cardiology'],
    // General Medicine
    ['apt-5','09:30 AM','Alice Peterson',34,'Routine Checkup','Routine','Checked In','General Medicine'],
    ['apt-6','10:00 AM','Aarav Patel',34,'Diabetes Review','Routine','Scheduled','General Medicine'],
    ['apt-7','02:30 PM','Deepak Rao',58,'Hypertension Review','High Priority','Waiting','General Medicine'],
    // Neurology
    ['apt-8','03:00 PM','Sneha Menon',31,'Migraine Follow-up','High Priority','Waiting','Neurology'],
    ['apt-9','04:00 PM','Thomas Henderson',73,'Parkinson Assessment','High Priority','Scheduled','Neurology'],
    // Orthopedics
    ['apt-10','01:00 PM','James Wilson',55,'Back Pain Consult','Routine','Scheduled','Orthopedics'],
    ['apt-11','01:30 PM','Karen Moore',47,'Knee Replacement Eval','High Priority','Checked In','Orthopedics'],
    // Pulmonology
    ['apt-12','10:30 AM','Sanjay Gupta',67,'COPD Management','High Priority','Checked In','Pulmonology'],
    ['apt-13','11:00 AM','Rita Bose',54,'Asthma Follow-up','Routine','Scheduled','Pulmonology'],
    // Psychiatry
    ['apt-14','09:00 AM','Anna Wells',29,'Anxiety Management','High Priority','Checked In','Psychiatry'],
    ['apt-15','10:00 AM','Michael Torres',35,'Depression Follow-up','Routine','Waiting','Psychiatry'],
    ['apt-16','11:30 AM','Jennifer Cole',44,'PTSD Therapy Session','High Priority','Scheduled','Psychiatry'],
    // Pediatrics
    ['apt-17','09:00 AM','Tommy Miller',6,'Vaccination Schedule','Routine','Checked In','Pediatrics'],
    ['apt-18','10:30 AM','Meera Nair',8,'Growth Assessment','Routine','Scheduled','Pediatrics'],
    // Dermatology
    ['apt-19','02:00 PM','Lisa Chang',33,'Eczema Follow-up','Routine','Waiting','Dermatology'],
    ['apt-20','03:00 PM','Robert Fox Jr.',28,'Psoriasis Management','High Priority','Scheduled','Dermatology'],
    // ENT
    ['apt-21','11:00 AM','Carlos Diaz',38,'Sinusitis Consult','Routine','Checked In','ENT'],
    ['apt-22','12:00 PM','Nancy Drew',52,'Hearing Assessment','Routine','Scheduled','ENT'],
    // Gastroenterology
    ['apt-23','01:30 PM','Priya Sharma',42,'IBS Follow-up','Routine','Waiting','Gastroenterology'],
    ['apt-24','02:30 PM','Daniel Kim',48,'Endoscopy Review','High Priority','Scheduled','Gastroenterology'],
    // Oncology
    ['apt-25','09:00 AM','William Ford',65,'Chemotherapy Cycle 4','High Priority','Checked In','Oncology'],
    ['apt-26','11:00 AM','Margaret Lee',58,'Breast Cancer Follow-up','High Priority','Scheduled','Oncology'],
  ];
  for (const a of aptData) insertApt.run(...a);

  const insertPat = db.prepare('INSERT OR IGNORE INTO patient_cards VALUES (?,?,?,?,?,?,?,?)');
  const patData = [
    // Cardiology
    ['pat-1','Marcus J.',45,'Male','Arrhythmia monitoring','Today','High Priority','Cardiology'],
    ['pat-2','Eleanor R.',62,'Female','Hypertension management','2 days ago','Routine','Cardiology'],
    ['pat-3','Robert P.',58,'Male','Post-surgery follow-up','1 week ago','Routine','Cardiology'],
    ['pat-4','Maria S.',71,'Female','Heart failure monitoring','3 days ago','High Priority','Cardiology'],
    ['pat-5','David L.',55,'Male','Cholesterol management','2 weeks ago','Routine','Cardiology'],
    ['pat-6','Sarah W.',48,'Female','Valve disorder check','5 days ago','Routine','Cardiology'],
    // General Medicine
    ['pat-7','Aarav Patel',34,'Male','Type 2 Diabetes','1 week ago','Routine','General Medicine'],
    ['pat-8','Deepak Rao',58,'Male','Hypertension + Prediabetes','Today','High Priority','General Medicine'],
    ['pat-9','Alice Peterson',34,'Female','Annual Physical','2 weeks ago','Routine','General Medicine'],
    // Neurology
    ['pat-10','Sneha Menon',31,'Female','Chronic Migraine','Today','High Priority','Neurology'],
    ['pat-11','Thomas Henderson',73,'Male','Parkinson Disease Stage 2','3 days ago','High Priority','Neurology'],
    ['pat-12','Emily Watson',45,'Female','Epilepsy monitoring','1 week ago','Routine','Neurology'],
    // Orthopedics
    ['pat-13','James Wilson',55,'Male','Chronic Lower Back Pain','3 days ago','Routine','Orthopedics'],
    ['pat-14','Karen Moore',47,'Female','Knee Osteoarthritis','Today','High Priority','Orthopedics'],
    // Pulmonology
    ['pat-15','Sanjay Gupta',67,'Male','COPD Stage 3','Today','High Priority','Pulmonology'],
    ['pat-16','Rita Bose',54,'Female','Asthma Management','1 week ago','Routine','Pulmonology'],
    // Psychiatry
    ['pat-17','Anna Wells',29,'Female','Generalized Anxiety Disorder','Today','High Priority','Psychiatry'],
    ['pat-18','Michael Torres',35,'Male','Major Depressive Disorder','3 days ago','High Priority','Psychiatry'],
    ['pat-19','Jennifer Cole',44,'Female','PTSD — Combat Veteran','1 week ago','High Priority','Psychiatry'],
    ['pat-20','Kevin Park',22,'Male','Social Anxiety Disorder','2 weeks ago','Routine','Psychiatry'],
    // Pediatrics
    ['pat-21','Tommy Miller',6,'Male','Childhood Asthma','Today','Routine','Pediatrics'],
    ['pat-22','Meera Nair',8,'Female','Growth Delay Assessment','1 week ago','High Priority','Pediatrics'],
    // Dermatology
    ['pat-23','Lisa Chang',33,'Female','Chronic Eczema','5 days ago','Routine','Dermatology'],
    ['pat-24','Robert Fox Jr.',28,'Male','Psoriasis — moderate','Today','High Priority','Dermatology'],
    // ENT
    ['pat-25','Carlos Diaz',38,'Male','Chronic Sinusitis','Today','Routine','ENT'],
    ['pat-26','Nancy Drew',52,'Female','Hearing Loss Assessment','2 weeks ago','Routine','ENT'],
    // Gastroenterology
    ['pat-27','Priya Sharma',42,'Female','Irritable Bowel Syndrome','3 days ago','Routine','Gastroenterology'],
    ['pat-28','Daniel Kim',48,'Male','GERD + Barrett Esophagus','Today','High Priority','Gastroenterology'],
    // Oncology
    ['pat-29','William Ford',65,'Male','Stage 3 Lung Cancer — Chemo','Today','High Priority','Oncology'],
    ['pat-30','Margaret Lee',58,'Female','Breast Cancer — Post-op','1 week ago','High Priority','Oncology'],
  ];
  for (const p of patData) insertPat.run(...p);

  const insertFlw = db.prepare('INSERT OR IGNORE INTO follow_ups VALUES (?,?,?,?,?,?,?)');
  const flwData = [
    // Cardiology
    ['flw-1','Marcus J.','AI Managed','48-hour symptom check-in','Tomorrow','High Priority','Cardiology'],
    ['flw-2','Eleanor R.','AI Managed','Blood pressure monitoring','In 2 days','Routine','Cardiology'],
    ['flw-3','Maria S.','AI Managed','Medication adherence check','In 3 days','High Priority','Cardiology'],
    // General Medicine
    ['flw-4','Aarav Patel','AI Managed','Blood sugar level review','In 1 week','Routine','General Medicine'],
    ['flw-5','Deepak Rao','AI Managed','BP medication adjustment check','In 3 days','High Priority','General Medicine'],
    // Neurology
    ['flw-6','Sneha Menon','Manual','Migraine frequency tracking','In 2 days','High Priority','Neurology'],
    ['flw-7','Thomas Henderson','AI Managed','Levodopa dosage evaluation','In 1 week','High Priority','Neurology'],
    // Orthopedics
    ['flw-8','James Wilson','AI Managed','Pain scale reassessment','In 5 days','Routine','Orthopedics'],
    ['flw-9','Karen Moore','Manual','Post-injection mobility check','In 3 days','High Priority','Orthopedics'],
    // Pulmonology
    ['flw-10','Sanjay Gupta','AI Managed','Oxygen saturation monitoring','Tomorrow','High Priority','Pulmonology'],
    ['flw-11','Rita Bose','AI Managed','Peak flow diary review','In 1 week','Routine','Pulmonology'],
    // Psychiatry
    ['flw-12','Anna Wells','AI Managed','Anxiety symptom tracking','In 2 days','High Priority','Psychiatry'],
    ['flw-13','Michael Torres','AI Managed','Medication response assessment','In 1 week','High Priority','Psychiatry'],
    ['flw-14','Jennifer Cole','Manual','Trauma therapy progress check','In 3 days','High Priority','Psychiatry'],
    ['flw-15','Kevin Park','AI Managed','Social exposure exercise review','In 2 weeks','Routine','Psychiatry'],
    // Pediatrics
    ['flw-16','Tommy Miller','AI Managed','Asthma action plan check','In 1 week','Routine','Pediatrics'],
    ['flw-17','Meera Nair','Manual','Growth chart follow-up','In 1 month','High Priority','Pediatrics'],
    // Dermatology
    ['flw-18','Lisa Chang','AI Managed','Eczema flare monitoring','In 1 week','Routine','Dermatology'],
    ['flw-19','Robert Fox Jr.','AI Managed','Biologic therapy response','In 2 weeks','High Priority','Dermatology'],
    // ENT
    ['flw-20','Carlos Diaz','AI Managed','Sinus symptom diary review','In 1 week','Routine','ENT'],
    // Gastroenterology
    ['flw-21','Priya Sharma','AI Managed','IBS symptom diary review','In 1 week','Routine','Gastroenterology'],
    ['flw-22','Daniel Kim','Manual','Endoscopy results review','In 3 days','High Priority','Gastroenterology'],
    // Oncology
    ['flw-23','William Ford','AI Managed','Chemo side effects monitoring','Tomorrow','High Priority','Oncology'],
    ['flw-24','Margaret Lee','AI Managed','Post-surgical wound check','In 5 days','High Priority','Oncology'],
  ];
  for (const f of flwData) insertFlw.run(...f);
}

seedClinicalIfEmpty();

// ─── Query Functions ───

export function getEmergencyQueueByDepartment(dept: string): EmergencyCase[] {
  const rows = db.prepare('SELECT * FROM emergencies WHERE LOWER(department) = LOWER(?)').all(dept) as any[];
  return rows.map(r => ({
    id: r.id, name: r.name, age: r.age, gender: r.gender, department: r.department,
    urgency: r.urgency, reason: r.reason, status: r.status,
    vitalsTransmitted: r.vitals_transmitted, roomPrepared: r.room_prepared, etaMinutes: r.eta_minutes,
    vitals: { bloodPressure: r.bp, heartRate: r.heart_rate, oxygenSaturation: r.oxygen_sat, temperature: r.temperature }
  }));
}

export function getAppointmentsByDepartment(dept: string): AppointmentRecord[] {
  return db.prepare('SELECT * FROM appointments WHERE LOWER(department) = LOWER(?)').all(dept) as any[];
}

export function getPatientCardsByDepartment(dept: string): PatientRecordCard[] {
  const rows = db.prepare('SELECT * FROM patient_cards WHERE LOWER(department) = LOWER(?)').all(dept) as any[];
  return rows.map(r => ({
    id: r.id, name: r.name, age: r.age, gender: r.gender,
    condition: r.condition, lastVisit: r.last_visit, priority: r.priority, department: r.department
  }));
}

export function getFollowUpsByDepartment(dept: string): FollowUpTask[] {
  const rows = db.prepare('SELECT * FROM follow_ups WHERE LOWER(department) = LOWER(?)').all(dept) as any[];
  return rows.map(r => ({
    id: r.id, patientName: r.patient_name, type: r.type,
    description: r.description, dueDate: r.due_date, priority: r.priority, department: r.department
  }));
}

// ─── Aggregate stats for admin dashboard ───

export function getClinicalStats() {
  const totalEmergencies = (db.prepare('SELECT COUNT(*) as c FROM emergencies').get() as any).c;
  const totalAppointments = (db.prepare('SELECT COUNT(*) as c FROM appointments').get() as any).c;
  const totalPatientCards = (db.prepare('SELECT COUNT(*) as c FROM patient_cards').get() as any).c;
  const totalFollowUps = (db.prepare('SELECT COUNT(*) as c FROM follow_ups').get() as any).c;
  const checkedIn = (db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status = 'Checked In'").get() as any).c;
  const waiting = (db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status = 'Waiting'").get() as any).c;
  return { totalEmergencies, totalAppointments, totalPatientCards, totalFollowUps, checkedIn, waiting };
}
