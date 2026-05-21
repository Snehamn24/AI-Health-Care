-- BigQuery schema for CareAssist analytics
-- Run in GCP Console or: bq query --use_legacy_sql=false < bigquery-schema.sql

CREATE SCHEMA IF NOT EXISTS healthcare_analytics
  OPTIONS (
    description = 'Healthcare intake and triage analytics',
    location = 'US'
  );

CREATE TABLE IF NOT EXISTS healthcare_analytics.intake_events (
  session_id STRING NOT NULL,
  patient_id STRING NOT NULL,
  symptoms ARRAY<STRING>,
  urgency STRING NOT NULL,
  department STRING NOT NULL,
  is_emergency BOOL NOT NULL,
  severity STRING,
  created_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(created_at)
CLUSTER BY department, urgency
OPTIONS (
  description = 'Patient intake events for Looker Studio dashboards'
);

-- Sample analytics views for Looker Studio
CREATE OR REPLACE VIEW healthcare_analytics.v_department_distribution AS
SELECT department, COUNT(*) AS case_count
FROM healthcare_analytics.intake_events
GROUP BY department;

CREATE OR REPLACE VIEW healthcare_analytics.v_emergency_rate AS
SELECT
  DATE(created_at) AS event_date,
  COUNTIF(is_emergency) AS emergency_cases,
  COUNT(*) AS total_cases,
  SAFE_DIVIDE(COUNTIF(is_emergency), COUNT(*)) * 100 AS emergency_pct
FROM healthcare_analytics.intake_events
GROUP BY event_date;

CREATE OR REPLACE VIEW healthcare_analytics.v_symptom_exploded AS
SELECT symptom, COUNT(*) AS frequency
FROM healthcare_analytics.intake_events, UNNEST(symptoms) AS symptom
GROUP BY symptom
ORDER BY frequency DESC;
