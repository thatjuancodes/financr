# Codebase Shape

This document describes the current structure of the app, the refactor direction already taken, and the working practices expected when editing the repo.

## Current State

The codebase is now organized around feature modules instead of a few giant files.

High-level status:
- Frontend is a React SPA with route-like view switching in `App.jsx`
- Backend is Express with feature route registrars instead of a single route dump
- CSS is split into imported partials instead of one monolithic stylesheet
- Shared logic is increasingly moving into hooks and utility modules

Rough current quality bar:
- Readability: around `9/10`
- Maintainability: around `9/10`
- Re-use: high, but still improving in a few hotspots

## Frontend Shape

Main entry points:
- [frontend/src/App.jsx](../frontend/src/App.jsx)
- [frontend/src/main.jsx](../frontend/src/main.jsx)
- [frontend/src/styles.css](../frontend/src/styles.css)

Main screen/view modules:
- [frontend/src/components/RightPanel.jsx](../frontend/src/components/RightPanel.jsx)
- [frontend/src/components/AccountsView.jsx](../frontend/src/components/AccountsView.jsx)
- [frontend/src/components/ProjectionsView.jsx](../frontend/src/components/ProjectionsView.jsx)
- [frontend/src/components/HomeDashboardView.jsx](../frontend/src/components/HomeDashboardView.jsx)
- [frontend/src/components/AppLayoutContent.jsx](../frontend/src/components/AppLayoutContent.jsx)

Important extracted RightPanel subviews:
- [RightPanelIncomeView.jsx](../frontend/src/components/RightPanelIncomeView.jsx)
- [RightPanelExpensesView.jsx](../frontend/src/components/RightPanelExpensesView.jsx)
- [RightPanelRecurringView.jsx](../frontend/src/components/RightPanelRecurringView.jsx)
- [RightPanelDebtView.jsx](../frontend/src/components/RightPanelDebtView.jsx)
- [RightPanelConfigView.jsx](../frontend/src/components/RightPanelConfigView.jsx)
- [RightPanelBalanceView.jsx](../frontend/src/components/RightPanelBalanceView.jsx)
- [RightPanelReportsView.jsx](../frontend/src/components/RightPanelReportsView.jsx)

Shared frontend hooks and utilities:
- [frontend/src/hooks/useRecordDrawerState.js](../frontend/src/hooks/useRecordDrawerState.js)
- [frontend/src/hooks/useRightPanelUiResets.js](../frontend/src/hooks/useRightPanelUiResets.js)
- [frontend/src/hooks/useAppDashboardMetrics.js](../frontend/src/hooks/useAppDashboardMetrics.js)
- [frontend/src/utils/recurring.js](../frontend/src/utils/recurring.js)
- [frontend/src/utils/appState.js](../frontend/src/utils/appState.js)
- [frontend/src/utils/accounts.js](../frontend/src/utils/accounts.js)
- [frontend/src/utils/rightPanel.js](../frontend/src/utils/rightPanel.js)
- [frontend/src/utils/rightPanelRecordActions.js](../frontend/src/utils/rightPanelRecordActions.js)
- [frontend/src/utils/rightPanelConfigActions.js](../frontend/src/utils/rightPanelConfigActions.js)
- [frontend/src/utils/rightPanelAdminActions.js](../frontend/src/utils/rightPanelAdminActions.js)
- [frontend/src/utils/rightPanelDebtActions.js](../frontend/src/utils/rightPanelDebtActions.js)

Frontend guidance:
- Keep screen components focused on orchestration and rendering
- Move reusable or non-visual behavior into hooks or utils
- If a component grows into a multi-domain controller, split by view or feature slice
- Prefer one source of truth for shared calculations like recurring monthly amounts or dashboard summaries

## Backend Shape

Main backend entry:
- [backend/src/server.js](../backend/src/server.js)

Backend route registrars already extracted:
- [backend/src/projectionScenarioRoutes.js](../backend/src/projectionScenarioRoutes.js)
- [backend/src/referenceDataRoutes.js](../backend/src/referenceDataRoutes.js)
- [backend/src/reportRoutes.js](../backend/src/reportRoutes.js)
- [backend/src/incomeRoutes.js](../backend/src/incomeRoutes.js)
- [backend/src/settingsBalanceRoutes.js](../backend/src/settingsBalanceRoutes.js)
- [backend/src/institutionRoutes.js](../backend/src/institutionRoutes.js)
- [backend/src/ledger.js](../backend/src/ledger.js)

Backend domain/service modules:
- [backend/src/db.js](../backend/src/db.js)
- [backend/src/projections.js](../backend/src/projections.js)
- [backend/src/generateMonthlyReport.js](../backend/src/generateMonthlyReport.js)
- [backend/src/categoryColors.js](../backend/src/categoryColors.js)

Backend guidance:
- New endpoints should usually live in a feature route registrar, not directly in `server.js`
- Keep validation and normalization close to the domain that uses them
- Prefer pure calculation helpers for deterministic logic
- Avoid route handlers becoming the only place where business rules exist

## CSS Shape

CSS entry:
- [frontend/src/styles.css](../frontend/src/styles.css)

Current CSS partials:
- [frontend/src/styles/base.css](../frontend/src/styles/base.css)
- [frontend/src/styles/tokens-layout.css](../frontend/src/styles/tokens-layout.css)
- [frontend/src/styles/forms-tables.css](../frontend/src/styles/forms-tables.css)
- [frontend/src/styles/reports-home.css](../frontend/src/styles/reports-home.css)
- [frontend/src/styles/projections-recurring.css](../frontend/src/styles/projections-recurring.css)
- [frontend/src/styles/shared-widgets.css](../frontend/src/styles/shared-widgets.css)

CSS guidance:
- Keep `styles.css` and `base.css` as import manifests only
- Place rules in the narrowest partial that matches feature ownership
- Preserve import order unless you are intentionally changing cascade behavior
- If a partial becomes a grab bag, split it again by feature or concern

## Practices Already Followed

These are the patterns already used in the current codebase. New work should continue them.

- Extract large JSX branches into dedicated view components
- Extract repeated state/drawer logic into hooks
- Extract feature actions into small utility modules when they are too large for the parent view
- Keep deterministic calculations in pure helpers where possible
- Keep build and tests green after every structural refactor
- Prefer feature-grouped modules over generic dumping grounds
- Split CSS by ownership, not by arbitrary line count alone

## Hotspots Still Worth Watching

These files are much better than before, but still deserve care:
- [backend/src/server.js](../backend/src/server.js)
- [frontend/src/components/AccountsView.jsx](../frontend/src/components/AccountsView.jsx)
- [frontend/src/styles/reports-home.css](../frontend/src/styles/reports-home.css)
- [frontend/src/styles/projections-recurring.css](../frontend/src/styles/projections-recurring.css)

When editing a hotspot:
- Look for an existing hook/util/feature file first
- If you are adding a new domain concern, prefer creating a sibling module
- Avoid putting shared logic back into the top-level controller file

## Testing Shape

Backend tests exist and are meaningful:
- [backend/src/entitiesTransfers.test.js](../backend/src/entitiesTransfers.test.js)
- [backend/src/institutions.test.js](../backend/src/institutions.test.js)
- [backend/src/projections.test.js](../backend/src/projections.test.js)
- [backend/src/generateMonthlyReport.test.js](../backend/src/generateMonthlyReport.test.js)

Frontend test coverage is still lighter and currently focused on shared utilities:
- [frontend/src/utils/recurring.test.js](../frontend/src/utils/recurring.test.js)

Expected verification after structural changes:
- `pnpm --dir frontend build`
- `pnpm --dir frontend test`
- `pnpm --dir backend test`

## Agent Rules Of Thumb

If you are another agent entering this repo:

- Read the feature doc in `docs/` first if you are changing behavior
- Prefer editing extracted modules instead of re-growing controller files
- If you touch recurring logic, check `frontend/src/utils/recurring.js`
- If you touch dashboard rollups, check `frontend/src/hooks/useAppDashboardMetrics.js`
- If you touch account helpers, check `frontend/src/utils/accounts.js`
- If you add backend endpoints, check whether a route registrar already exists for that domain
- If you add styles, decide the feature partial first before writing selectors

## Refactor Direction

The repo has already moved away from:
- giant all-in-one screen files
- giant all-in-one backend route files
- giant all-in-one CSS

The intended direction is:
- feature modules
- shared hooks for reusable UI state
- pure helpers for deterministic calculations
- route registrars per backend domain
- CSS partials with explicit ownership

Do not reverse that direction unless there is a strong reason.
