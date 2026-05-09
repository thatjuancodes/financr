# Entities

## Purpose
Entities are ownership scopes for money and records.

Examples:
- personal
- family
- business

## Current Model

```txt
Entity {
  id: string
  name: string
  type: "personal" | "family" | "business"
  created_at: timestamp
  updated_at: timestamp
}
```

Default seeded entities in the app were later renamed in real data, but the seeded types remain:
- personal
- family
- business

## What Entity Scope Affects
Entity filtering is used across:
- Home dashboard
- Accounts
- Income
- Expenses
- Recurring
- Debt
- Reports
- Projections

An entity can also own:
- accounts
- income rows
- expense rows
- debt rows
- recurring items
- projection scenarios

## Core Rules
- Every account belongs to one entity.
- Entity type must be one of `personal`, `family`, `business`.
- Deleting an entity with accounts is blocked.
- Cross-entity transfers are allowed.
- Some derived screens use entity perspective, not just row ownership:
  recurring transfers can now appear for both entities involved.

## Current UI
Entity management lives mainly in the Accounts view:
- entity selector
- add entity drawer
- edit entity drawer
- delete entity action
- entity list with account counts

Other screens consume the current entity filter but do not manage entities directly.

## API Touchpoints

```txt
GET    /entities
POST   /entities
PUT    /entities/:id
DELETE /entities/:id
GET    /entities/:id/accounts
```

Common entity-scoped endpoints:

```txt
GET /balance?entity_id=...
GET /income?entity_id=...
GET /expenses?entity_id=...
GET /recurring-items?entity_id=...
GET /debts?entity_id=...
GET /monthly-reports?entity_id=...
GET /projection-scenarios?entity_id=...
GET /accounts?entity_id=...
```

## Notes
- Entity is the app’s current ownership layer. There is still no user/auth layer.
