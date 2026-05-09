# Projections

## Purpose
Projections model hypothetical future outcomes without changing real balances.

## Current Scope
The Projections feature currently supports:
- separate projections page
- scenario list by workspace and entity
- create, edit, delete, duplicate
- auto-save
- deterministic calculation
- live preview and chart
- move projection to another entity

## Current Model

```txt
ProjectionScenario {
  id: string
  workspace_id: string
  entity_id: string
  name: string
  type: "SAVINGS"
  currency: string
  initial_amount: number
  annual_interest_rate: number
  duration_months: integer
  monthly_contribution: number
  compounding_frequency: "monthly"
  cashflow_assumptions: object
  notes: string | null
  created_at: timestamp
  updated_at: timestamp
}
```

## Core Rules
- Projection results are computed on demand, not stored.
- Calculations are deterministic. There is no AI path in v1.
- Projections belong to one workspace and one entity.
- Amount inputs support formatting in the UI.
- Chart interactions can temporarily change the displayed result cards.

## Cashflow Assumptions
Projection scenarios can now include optional factors such as:
- added recurring income
- added recurring expense
- expense category percent changes

Default behavior:
- existing history is reference data
- projection does not automatically modify itself from historical cashflow unless a factor is added

## Current UI
The Projections page includes:
- left scenario list
- right editor panel
- result cards
- line chart
- move-to-entity control
- autosave status and empty state

## API Touchpoints

```txt
GET    /projection-scenarios
POST   /projection-scenarios
GET    /projection-scenarios/:id
PUT    /projection-scenarios/:id
DELETE /projection-scenarios/:id
POST   /projection-scenarios/:id/duplicate
POST   /projection-scenarios/preview
```

## Notes
- Projections are explicitly hypothetical and do not post ledger transactions.
