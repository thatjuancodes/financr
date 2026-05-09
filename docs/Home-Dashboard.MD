# Home Dashboard

## Purpose
Home is the summary view for the selected entity or all entities.

## Current Scope
The dashboard currently shows:
- current balance
- upcoming recurring obligations
- safe to spend
- buffer months
- six-month projection chart
- monthly totals cards
- top expense categories
- top recent debt categories

## Current Balance
Current balance is derived from account balances, not stored separately.

Important behavior:
- if one currency is in scope, cards use that currency
- if multiple currencies are in scope, balance uses currency summary formatting
- the selected entity name is shown in the balance formula help text

## Recurring Impact
Home uses recurring data for:
- upcoming recurring expenses
- safe to spend
- six-month savings projection

Recurring transfers can now affect rollups from entity perspective:
- outgoing transfer counts from source side
- incoming transfer counts from destination side

## Current UI
Main Home widgets include:
- stat cards
- projection line chart
- monthly summary cards
- top categories tables
- info tooltips for formulas

## Inputs
The dashboard depends on:
- selected entity filter
- selected month
- account balances
- recurring items
- expenses
- income
- debt

## Notes
- Home is the most cross-cutting screen in the app. It depends on almost every core feature.
