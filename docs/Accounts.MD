# Accounts

## Purpose
Accounts are the balance-bearing containers in the app.

Examples:
- Cash on Hand
- BPI savings
- GCash wallet

Institutions are provider references. Accounts are user-owned containers that belong to one entity.

## Current Scope
The Accounts feature owns:
- entity-scoped account lists
- account creation and editing
- institution compatibility rules
- initial balance creation
- manual balance adjustments
- transfer creation and removal
- ledger transaction browsing
- default income and expense account preferences

## Current Model
Runtime account rows:

```txt
Account {
  id: integer
  name: string
  type: "cash" | "bank" | "ewallet"
  entity_id: string
  institution_id: string | null
  currency_code: string
  created_at: timestamp
}
```

Computed account payload shown in UI/API:

```txt
AccountView {
  id
  name
  type
  entity_id
  entity_name
  institution_id
  institution
  currency_code
  balance
}
```

## Core Rules
- Every account belongs to exactly one entity.
- Account names are unique per entity, case-insensitive.
- `cash` accounts cannot have an institution.
- `bank` accounts require a `bank` institution.
- `ewallet` accounts require an `e_wallet` institution.
- Account balance is derived, not stored directly on the account row.
- Initial balance is stored as an `initial_balance` ledger transaction.
- Transfers require source and destination accounts with the same currency.
- `Cash on Hand` is protected from deletion.

## Balance Sources
Account balances are derived from:
- income transactions
- expense transactions
- initial balance transactions
- transfer transactions
- transfer records in the `transfers` table

## Current UI
The Accounts page currently supports:
- entity switcher and entity management
- account list for the selected entity
- add account drawer
- edit account drawer
- initial balance workflow
- manual balance adjustment workflow
- transfer workflow
- transaction history filters
- default income and expense account settings

## Main Flows
Create account:
- requires `name`, `type`, `entity_id`
- requires `institution_id` for `bank` and `ewallet`
- optional `initial_amount` and `initial_date`

Edit account:
- update `name`, `type`, `entity_id`, `institution_id`, `currency_code`

Transfer:
- requires `from_account_id`, `to_account_id`, `amount`, `date`
- cross-entity transfers are allowed
- cross-currency transfers are blocked

## API Touchpoints

```txt
GET    /accounts
POST   /accounts
PUT    /accounts/:id
DELETE /accounts/:id

GET    /transactions
POST   /transactions
PUT    /transactions/:id
DELETE /transactions/:id

GET    /transfers
POST   /transfers
DELETE /transfers/:id

GET    /settings
PUT    /settings/default-accounts
```

## Notes
- The homepage current balance is derived from account balances, not from a standalone stored balance.
- Currency is account-level, so the same entity can have balances in multiple currencies.
