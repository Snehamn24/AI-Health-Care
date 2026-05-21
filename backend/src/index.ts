import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { apiRouter } from './routes/api.js';
import { seedDatabase } from './services/seed-dataset.js';

// Seed the SQLite database with medical dataset on first run
seedDatabase();

const app = express();

app.use(
  cors({
    origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

app.use('/api', apiRouter);

app.get('/', (_req, res) => {
  res.json({
    name: 'CareAssist — Healthcare Intake & Triage API',
    version: '1.0.0',
    docs: '/api/health',
  });
});

app.listen(config.port, () => {
  console.log(`CareAssist API running on port ${config.port} (demoMode=${config.demoMode})`);
});
