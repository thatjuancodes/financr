# Agents.md – Finance POC

This document defines the technical “agents” for the Finance POC: stack choices, programming best practices, and coding constraints for the project.

---

## 1. Stack Overview

| Layer           | Choice                       | Notes                                                                            |
| --------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| Frontend        | React (Vite)                 | Minimal UI, focus on flow. Will later migrate to React Native or PWA for mobile. |
| Backend         | Node.js + Express            | Simple REST API to SQLite. Local-first, lightweight, easy to extend.             |
| Database        | SQLite                       | File-based persistence. Supports migrations. Easy to switch to Postgres later.   |
| Package Manager | pnpm                         | Fast, lightweight, consistent dependency management.                             |
| Hosting         | Local / Netlify for frontend | Backend runs locally for now. Frontend can be deployed on Netlify for testing.   |
| ORM / Query     | Drizzle ORM (optional)       | Makes migrations and queries easier. Otherwise raw `better-sqlite3` queries.     |

---

## 2. Programming Best Practices

* **Keep it modular**: Separate backend routes, DB queries, and frontend components.
* **Schema versioning**: Use explicit migration files for SQLite schema changes.
* **Stateless frontend**: All calculations (balance, suggestions) can be derived from API data.
* **Immutable state updates** in React: `useState` / `useReducer` to avoid unexpected mutations.
* **Minimal dependencies**: Avoid large frameworks unless necessary.
* **Consistency**: Always use ISO date format (`YYYY-MM-DD`) in DB.

---

## 3. Coding Constraints

* **Local-first**: App must work without backend initially; SQLite is sufficient.
* **No auth**: Single-user experiment for now.
* **API contract**: All endpoints return JSON; minimal REST conventions.
* **Smart defaults**: Expense amounts can prefill with last amount per category.
* **Scheduling**: Income can be scheduled; agent calculates balance including future income.
* **Migration-ready**: Schema should allow future upgrades (e.g., adding recurring expenses).
* **Mobile-ready**: Frontend should render on mobile screens without major changes.
* **No external DB** required at POC stage — optional cloud migration later.

---

## 4. Development Notes

* **Backend**: Node.js + Express routes directly query SQLite (via `better-sqlite3`)
* **Frontend**: React fetches JSON from backend, minimal UI components.
* **Balance Calculation**: Done on backend `/balance` route for simplicity.
* **Data Flow**: Frontend → API → SQLite → Frontend; all state derived from API.
* **Future proofing**: Codebase structured to allow adding:

  * Smart suggestions (expense categories)
  * Recurring transactions
  * Multi-user / auth layer

---

**Summary:**
This is a **local-first, minimal POC architecture**. Focus is on **flow and usability**, not UI or deployment yet. Backend is lightweight and SQLite-based; frontend is React-based and mobile-ready. All coding decisions aim for **easy iteration, future migrations, and minimal friction**.
