# Config

## Purpose
Config is the maintenance area for app-wide defaults and supporting metadata.

## Current Scope
The Config feature currently manages:
- base settings
- default currency
- default income and expense accounts
- expense categories
- income categories
- expense suggestions
- loan origin configs
- institutions

## Settings
Global settings currently include:
- `base_balance`
- `currency_code`
- `default_expense_account_id`
- `default_income_account_id`

These affect:
- money formatting defaults
- account and transaction drawers
- balance calculations shown in the app

## Category Management
Config owns:
- expense categories
- income categories
- category colors
- category CRUD

These feed:
- income classification
- expense classification
- recurring category assignment
- reports and dashboard breakdowns

## Expense Suggestions
Expense suggestions are stored separately from categories.

They are used to:
- prefill expense names
- prefill last amount
- prefill category
- mark suggestions as selected for quick entry

## Loan Origin Configs
Loan origin configs store statement and due-day rules for debt reporting.

They are used by:
- debt statement-cycle grouping
- remaining-days calculations
- payoff workflows

## Institutions
Institutions are managed from Config but documented separately in [Institutions.MD](./Institutions.MD).

## API Touchpoints

```txt
GET /settings
PUT /settings/base-balance
PUT /settings/currency
PUT /settings/default-accounts

GET    /categories
POST   /categories
PUT    /categories/:id
DELETE /categories/:id

GET    /income-categories
POST   /income-categories
PUT    /income-categories/:id
DELETE /income-categories/:id

GET    /expense-suggestions
PUT    /expense-suggestions
DELETE /expense-suggestions/:category

GET    /loan-origin-configs
PUT    /loan-origin-configs
DELETE /loan-origin-configs/:loan_origin
```

## Notes
- Config is not just “app settings”. It is also the metadata maintenance surface for the rest of the product.
