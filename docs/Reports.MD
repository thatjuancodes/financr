# Reports

## Purpose
Reports provide month-based summaries and drill-down detail.

## Current Scope
The Reports feature currently supports:
- monthly report list
- detailed monthly report view
- report generation
- category and transaction drill-down
- entity-scoped reports

## Current Report Content
Generated report payloads include summary data such as:
- income totals
- expense totals
- debt totals
- recurring snapshot
- category breakdowns
- transaction lists

## Core Rules
- Reports are keyed by `month_key` and `entity_id`.
- Reports are generated on demand and then persisted.
- Report list and detail are both entity-aware.
- Transactions can be paginated in detail view.

## Current UI
The Reports area currently supports:
- reports list
- open report detail
- go back to list
- generate monthly report
- report month routing via hash route

## API Touchpoints

```txt
GET  /monthly-reports
GET  /monthly-reports/:month_key
POST /monthly-reports/generate
```

## Notes
- Reports are derived summaries, not the primary data entry layer.
