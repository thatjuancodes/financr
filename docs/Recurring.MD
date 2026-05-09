# Recurring

## Purpose
Recurring stores scheduled templates that can later be confirmed into real records.

## Current Scope
Recurring currently supports three template types:
- `expense`
- `income`
- `transfer`

It also supports:
- pending due view
- confirm
- skip
- edit
- delete
- recurring summary cards

## Current Model

```txt
RecurringItem {
  id: integer
  type: "expense" | "income" | "transfer"
  entity_id: string
  amount: number
  category: string
  expense_category_id: integer | null
  income_category_id: integer | null
  from_account_id: integer | null
  to_account_id: integer | null
  mirror_as_income_expense: boolean
  description: string | null
  frequency: "weekly" | "monthly" | "yearly" | "semi_monthly"
  semi_monthly_day_1: integer | null
  semi_monthly_day_2: integer | null
  next_due_date: ISO date
  last_confirmed_date: ISO date | null
}
```

## Core Rules
- `semi_monthly` is only valid for income templates.
- Transfer templates require different source and destination accounts.
- Transfer accounts must share the same currency.
- Cross-entity transfer templates are allowed.
- When a transfer is cross-entity, the UI can optionally mirror:
  - expense on source entity
  - income on destination entity
- Recurring transfers now appear from the perspective of either entity involved.

## Confirm Behavior
Confirming a template creates real rows:
- income template -> income row
- expense template -> expense row
- transfer template -> transfer row

Optional transfer mirror behavior:
- source side becomes expense
- destination side becomes income

## Current UI
Recurring view currently includes:
- add recurring drawer
- edit recurring drawer
- pending recurring due table
- recurring summary cards
- frequency filter
- separate tables for income, transfers, and expenses

## Rollup Behavior
Recurring cards convert frequency to weekly and monthly rates.

Transfer perspective depends on selected entity:
- outgoing transfer counts like expense
- incoming transfer counts like income

## API Touchpoints

```txt
GET    /recurring-items
GET    /recurring-items/pending
POST   /recurring-items
PUT    /recurring-items/:id
DELETE /recurring-items/:id
POST   /recurring-items/:id/confirm
POST   /recurring-items/:id/skip
```

## Notes
- Recurring is template-driven. It does not edit past confirmed rows.
