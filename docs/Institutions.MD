# Institutions

## Purpose
Institutions are reference records used by bank and e-wallet accounts.

They represent providers, not balances.

## Current Model

```txt
Institution {
  id: string
  name: string
  type: "bank" | "e_wallet"
  code: string | null
  swift_code: string | null
  currency_code: string
  country: string
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

## Seeded Institutions
The app seeds common PH institutions, including:
- BDO
- BPI
- UnionBank
- PNB
- GCash
- Maya

## Core Rules
- Institution names are unique, case-insensitive.
- `bank` institutions may have `swift_code`.
- `e_wallet` institutions must not have `swift_code`.
- Soft delete is used through `is_active = false`.
- Account type and institution type must match.

## Current UI
Institution management currently lives in Config.

Supported actions:
- list institutions
- create institution
- update institution
- deactivate institution

## API Touchpoints

```txt
GET    /institutions
POST   /institutions
PATCH  /institutions/:id
DELETE /institutions/:id
```

## Notes
- Institutions help drive account validation and default currency behavior.
