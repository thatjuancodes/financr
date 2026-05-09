# Income

## Purpose
Income tracks money received by an entity.

## Current Scope
The Income feature currently supports:
- add income
- edit income
- delete income
- category assignment
- month filtering
- category filtering

## Current Model

```txt
Income {
  id: integer
  amount: number
  source: string
  entity_id: string
  received_date: ISO date
  income_category_id: integer | null
}
```

## Core Rules
- Every income row belongs to one entity.
- Source text and category assignment are separate.
- Income rows feed:
  - account balances
  - dashboard summaries
  - reports
  - projections history

## Current UI
The Income view includes:
- add income drawer
- edit income drawer
- category assignment
- month filter
- category filter

## API Touchpoints

```txt
GET    /income
POST   /income
PUT    /income/:id
DELETE /income/:id
PUT    /income/:id/category
```

## Notes
- Recurring income confirmation creates ordinary income rows.
- Cross-entity recurring transfers can optionally mirror into income on the destination entity.
