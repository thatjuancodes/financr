# Architecture

This document describes the active implementation for the finance app after the
workspace and auth layer was added.

## Overview

The app is still a local-first finance system, but it is no longer single-user.
The new collaboration layer sits above the existing finance model:

`users -> workspace_members -> workspaces -> entities -> accounts / financial records`

Key rules:

- `workspace` is the storage and API term.
- `Space` is the UI term.
- Users never own entities or accounts directly.
- Entities remain the ownership layer for finance records.
- Accounts still belong to entities.
- Legacy and modern financial data stay in place and are scoped through entity or account ownership.

## Active Frontend Target

The active frontend remains the routed TypeScript app:

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/router/config.tsx`
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/contexts/WorkspaceContext.tsx`
- `frontend/src/contexts/FinanceDataContext.tsx`

The legacy path still exists:

- `frontend/src/main.jsx`
- `frontend/src/App.jsx`

It is not the primary implementation target.

## Backend Shape

Primary backend entry:

- `backend/src/server.js`

Supporting backend modules:

- `backend/src/db.js`
- `backend/src/auth.js`
- `backend/src/authRoutes.js`
- `backend/src/workspaces.js`
- `backend/src/workspaceRoutes.js`
- existing finance route modules such as `incomeRoutes.js`, `debtRoutes.js`, `budgetRoutes.js`, `settingsBalanceRoutes.js`, `reportRoutes.js`, `institutionRoutes.js`, and `ledger.js`

The backend remains an Express JSON API over SQLite.

## Ownership Model

### Collaboration Layer

- `users` stores login identities.
- `workspaces` stores Space containers.
- `workspace_members` maps users to workspaces with `owner` or `member`.
- `workspace_invites` stores private-alpha invite tokens and acceptance metadata.
- `auth_sessions` stores bearer-session records.

### Finance Layer

- `entities.workspace_id` now connects the collaboration layer to the existing finance model.
- `accounts.entity_id` remains unchanged.
- Most finance tables continue to scope through `entity_id`.
- Transfers and modern transactions continue to scope through account ownership.

## Auth Flow

Auth is intentionally simple and replaceable later.

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Current behavior:

- signup creates the user, creates a default Space workspace named `My Space`, adds the user as owner, creates an initial `Personal` entity, and returns the active workspace plus bearer token
- login returns the current user, workspace memberships, active/default workspace, and bearer token
- protected routes require `Authorization: Bearer <token>`
- finance routes also require `x-workspace-id`

The implementation uses local password hashing and session rows so Supabase Auth can replace it later without rewriting the finance model.

## Workspace Context And Routing

Frontend providers:

- `AuthContext` owns the current user and login/session lifecycle.
- `WorkspaceContext` owns workspace membership data and the active workspace.
- `FinanceDataContext` only loads finance data when both auth and active workspace are present.

New routed pages:

- `/login`
- `/signup`
- `/onboarding`
- `/household`
- `/invite/:token`

Protected routing rules:

- unauthenticated users are sent to `/login`
- authenticated users without an active workspace are sent to `/onboarding`
- authenticated users with a workspace can access the finance app

## Invite Flow

Owner flow:

1. Owner calls `POST /workspaces/:workspaceId/invites`.
2. Backend creates a time-limited pending invite token.
3. API returns the invite token and local-alpha invite link in JSON.

Recipient flow:

1. Recipient opens `/invite/:token`.
2. If not logged in, they are directed to signup or login.
3. `POST /invites/:token/accept` adds the user to `workspace_members`.
4. The invite is marked accepted and duplicate acceptance stays idempotent.

## Workspace Scoping Rules

No finance data is trusted from frontend filtering alone.

Backend enforcement rules:

- the request user must be a member of the active workspace
- every entity input must belong to the active workspace
- every account input must belong to an entity in the active workspace
- cross-workspace transfers are blocked

Query patterns:

- entity-scoped tables join through `entities.workspace_id`
- account-scoped tables join through `accounts.entity_id -> entities.workspace_id`
- transfer and transaction queries join both sides through account ownership
- the unified `/transactions` feed scopes legacy income, expenses, debts, recurring activity, transfers, and modern transactions through workspace ownership
- stored monthly reports are now keyed by `workspace_id + month_key + entity_id` so an all-entities report cannot leak across spaces

## Legacy Data Backfill

When legacy entities have no workspace assignment:

- a main local owner user is ensured for `jmgaudielalvarez@gmail.com`
- a workspace named `Alvarez Organization` is ensured
- the owner is added to that workspace
- all unscoped entities are attached to that workspace

This preserves existing entities, accounts, and finance records without rewriting the finance data model.

## Current Shared vs Workspace-Owned Tables

Workspace-owned through entity or account:

- `entities`
- `accounts`
- `income`
- `expenses`
- `debts`
- `recurring_items`
- `budgets`
- `life_insurances`
- `monthly_reports`
- `projection_scenarios`
- `transfers`
- `transactions`

Currently still app-level/shared in this phase:

- `settings`
- `categories`
- `income_categories`
- `institutions`
- `loan_origin_configs`

That is acceptable for the current private alpha, but these are the next candidates if stronger per-workspace isolation is needed later.
