# Looker Studio Dashboard Setup

Connect Looker Studio to BigQuery table `healthcare_analytics.intake_events` for production analytics.

## Steps

1. Deploy BigQuery schema: run `bigquery-schema.sql` in your GCP project.
2. Ensure the API writes events (`insertIntakeEvent` on completed intake).
3. Open [Looker Studio](https://lookerstudio.google.com/) → Create → Data Source → BigQuery.
4. Select project → `healthcare_analytics` → `intake_events`.

## Recommended Charts

| Chart | Dimension | Metric |
|-------|-----------|--------|
| Department distribution | `department` | Record count |
| Emergency rate | `is_emergency` | % of total |
| Symptom frequency | Unnest `symptoms` (use `v_symptom_exploded` view) | Count |
| Traffic trend | `created_at` (date) | Sessions per day |
| Severity breakdown | `severity` | Count |

## Filters

- Date range on `created_at`
- Urgency level: `urgency`
- Department: `department`

## Demo Mode

When `DEMO_MODE=true`, analytics are served from in-memory sample data in the API. The embedded React dashboard mirrors the same metrics for local demos.
