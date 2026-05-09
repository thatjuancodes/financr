# Expenses

## Purpose
Expenses track outgoing money at the entity level.

## Current Scope
The Expenses feature currently supports:
- add expense
- edit expense
- delete expense
- category assignment
- expectation assignment
- mark expense as recurring
- month, date-range, and category filters

## Current Model

```txt
Expense {
  id: integer
  amount: number
  category: string
  entity_id: string
  notes: string | null
  spent_at: ISO date
  created_at: timestamp | null
  expense_category_id: integer | null
  expense_expectation: "expected" | "unexpected"
}
```

## Core Rules
- Every expense belongs to one entity.
- Category name and category assignment are separate:
  the row still keeps its own `category` text field.
- Expense expectation can be `expected` or `unexpected`.
- Expense rows feed:
  - balance calculations
  - dashboard breakdowns
  - monthly reports
  - projections history

## Current UI
The Expenses view includes:
- add expense drawer
- edit expense drawer
- category badge menu
- expectation selector
- mark-as-recurring action
- sort controls
- month filter
- date range filters
- category filter

## API Touchpoints

```txt
GET    /expenses
POST   /expenses
PUT    /expenses/:id
DELETE /expenses/:id
PUT    /expenses/:id/category
PUT    /expenses/:id/expectation
POST   /expenses/:id/mark-recurring
```

## Notes
- Expense suggestions are maintained separately and can prefill expense entry.
- Marking an expense as recurring creates a recurring template, not a linked relationship.
