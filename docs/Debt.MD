# Debt

## Purpose
Debt tracks liabilities, statement-cycle grouping, and payoff flows.

## Current Scope
The Debt feature currently supports:
- manual debt entry
- CSV import
- debt category assignment
- loan origin tracking
- statement-cycle grouping
- remaining-days display
- bulk delete
- payoff by loan origin

## Current Model

```txt
Debt {
  id: integer
  amount: number
  name: string
  entity_id: string
  loan_origin: string | null
  notes: string | null
  spent_at: ISO date
  statement_month: YYYY-MM | null
  debt_category_id: integer | null
  created_at: timestamp
}
```

## Core Rules
- Every debt row belongs to one entity.
- Debt is modeled separately from expenses.
- Statement month can be explicit or derived from loan origin config.
- Loan origin config can define `statement_day` and `due_day`.

## Current UI
The Debt view includes:
- add debt drawer
- import CSV drawer
- edit debt drawer
- debt table with sorting
- debt category assignment
- debt month and category filters
- statement-cycle totals
- remaining-days indicators
- payoff-by-origin action
- bulk selection and delete

## API Touchpoints

```txt
GET    /debts
POST   /debts
PUT    /debts/:id
DELETE /debts/:id
PUT    /debts/:id/category
POST   /debts/import-csv
POST   /debts/payoff

GET    /debt-origins
GET    /loan-origin-configs
PUT    /loan-origin-configs
DELETE /loan-origin-configs/:loan_origin
```

## Notes
- Debt is included in balance-home calculations and report views, but it is maintained from its own screen.
