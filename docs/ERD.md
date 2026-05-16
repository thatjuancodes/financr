# ERD

This ERD focuses on the active ownership and finance relationships after the
workspace layer was introduced.

```mermaid
erDiagram
    USERS {
        text id PK
        text email UK
        text name
        text password_hash
        text created_at
        text updated_at
    }

    WORKSPACES {
        text id PK
        text name
        text type
        text created_by_user_id FK
        text created_at
        text updated_at
    }

    WORKSPACE_MEMBERS {
        text workspace_id PK,FK
        text user_id PK,FK
        text role
        text joined_at
    }

    WORKSPACE_INVITES {
        text id PK
        text workspace_id FK
        text email
        text role
        text token UK
        text status
        text invited_by_user_id FK
        text accepted_by_user_id FK
        text expires_at
        text created_at
        text accepted_at
    }

    AUTH_SESSIONS {
        text id PK
        text user_id FK
        text token_hash UK
        text created_at
        text expires_at
        text revoked_at
        text last_used_at
    }

    ENTITIES {
        text id PK
        text workspace_id FK
        text name
        text type
        text created_at
        text updated_at
    }

    ACCOUNTS {
        integer id PK
        text entity_id FK
        text institution_id FK
        text name
        text type
        text currency_code
        text created_at
    }

    INCOME {
        integer id PK
        text entity_id FK
        integer to_account_id FK
        integer income_category_id FK
        real amount
        text source
        text received_date
    }

    EXPENSES {
        integer id PK
        text entity_id FK
        integer from_account_id FK
        integer expense_category_id FK
        real amount
        text category
        text spent_at
    }

    DEBTS {
        integer id PK
        text entity_id FK
        integer debt_category_id FK
        real amount
        text loan_origin
        text spent_at
        text statement_month
    }

    RECURRING_ITEMS {
        integer id PK
        text entity_id FK
        integer from_account_id FK
        integer to_account_id FK
        integer expense_category_id FK
        integer income_category_id FK
        text type
        real amount
        text frequency
        text next_due_date
    }

    BUDGETS {
        integer id PK
        text entity_id FK
        text name
        real target_amount
        text start_date
        text target_date
    }

    LIFE_INSURANCES {
        integer id PK
        text entity_id FK
        text provider
        text policy_name
        real coverage_amount
    }

    MONTHLY_REPORTS {
        integer id PK
        text workspace_id FK
        text entity_id
        text month_key
        text generated_at
        text updated_at
    }

    PROJECTION_SCENARIOS {
        text id PK
        text workspace_id FK
        text entity_id FK
        text name
        text type
        text currency
    }

    TRANSFERS {
        text id PK
        integer from_account_id FK
        integer to_account_id FK
        integer amount_cents
        text transfer_date
    }

    TRANSACTIONS {
        integer id PK
        integer from_account_id FK
        integer to_account_id FK
        text type
        integer amount_cents
        text created_at
    }

    USERS ||--o{ WORKSPACE_MEMBERS : joins
    WORKSPACES ||--o{ WORKSPACE_MEMBERS : has
    USERS ||--o{ WORKSPACE_INVITES : sends
    USERS ||--o{ AUTH_SESSIONS : owns
    WORKSPACES ||--o{ WORKSPACE_INVITES : contains
    WORKSPACES ||--o{ ENTITIES : owns
    ENTITIES ||--o{ ACCOUNTS : owns
    ENTITIES ||--o{ INCOME : scopes
    ENTITIES ||--o{ EXPENSES : scopes
    ENTITIES ||--o{ DEBTS : scopes
    ENTITIES ||--o{ RECURRING_ITEMS : scopes
    ENTITIES ||--o{ BUDGETS : scopes
    ENTITIES ||--o{ LIFE_INSURANCES : scopes
    ENTITIES ||--o{ PROJECTION_SCENARIOS : scopes
    ACCOUNTS ||--o{ TRANSFERS : from_account
    ACCOUNTS ||--o{ TRANSFERS : to_account
    ACCOUNTS ||--o{ TRANSACTIONS : from_account
    ACCOUNTS ||--o{ TRANSACTIONS : to_account
    ACCOUNTS ||--o{ INCOME : credits
    ACCOUNTS ||--o{ EXPENSES : debits
    ACCOUNTS ||--o{ RECURRING_ITEMS : posts
    WORKSPACES ||--o{ MONTHLY_REPORTS : stores
```

## Scoping Notes

- Most finance tables remain safely scoped through `entity_id`.
- Modern transfers and transactions remain safely scoped through account ownership.
- `monthly_reports` now stores `workspace_id` because all-entities monthly reports cannot be derived safely from `entity_id` alone.
- `projection_scenarios` already use `workspace_id`.
