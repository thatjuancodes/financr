const API_BASE = import.meta.env.VITE_API_BASE || "/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => null);
      if (body && typeof body.error === "string" && body.error.trim()) {
        throw new Error(body.error);
      }
    }
    const message = await res.text();
    throw new Error(message || "Request failed");
  }
  return res.json();
}

async function requestFile(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => null);
      if (body && typeof body.error === "string" && body.error.trim()) {
        throw new Error(body.error);
      }
    }
    const message = await res.text();
    throw new Error(message || "Request failed");
  }

  const contentDisposition = res.headers.get("content-disposition") || "";
  let filename = "export.csv";
  const utf8NameMatch = contentDisposition.match(/filename\\*=UTF-8''([^;]+)/i);
  if (utf8NameMatch?.[1]) {
    filename = decodeURIComponent(utf8NameMatch[1]);
  } else {
    const plainNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (plainNameMatch?.[1]) {
      filename = plainNameMatch[1];
    }
  }

  return {
    blob: await res.blob(),
    filename,
  };
}

export const api = {
  getSettings: () => request("/settings"),
  setBaseBalance: (base_balance) =>
    request("/settings/base-balance", {
      method: "PUT",
      body: JSON.stringify({ base_balance }),
    }),
  setCurrency: (currency_code) =>
    request("/settings/currency", {
      method: "PUT",
      body: JSON.stringify({ currency_code }),
    }),
  setDefaultAccounts: (payload) =>
    request("/settings/default-accounts", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  getIncome: (params = {}) => {
    const query = new URLSearchParams();
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/income${suffix}`);
  },
  addIncome: (payload) =>
    request("/income", { method: "POST", body: JSON.stringify(payload) }),
  updateIncome: (id, payload) =>
    request(`/income/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteIncome: (id) => request(`/income/${id}`, { method: "DELETE" }),
  updateIncomeCategory: (id, income_category_id) =>
    request(`/income/${id}/category`, {
      method: "PUT",
      body: JSON.stringify({ income_category_id }),
    }),
  getExpenses: (params = {}) => {
    const query = new URLSearchParams();
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/expenses${suffix}`);
  },
  addExpense: (payload) =>
    request("/expenses", { method: "POST", body: JSON.stringify(payload) }),
  updateExpense: (id, payload) =>
    request(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: "DELETE" }),
  markExpenseRecurring: (id, payload = {}) =>
    request(`/expenses/${id}/mark-recurring`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateExpenseCategory: (id, expense_category_id) =>
    request(`/expenses/${id}/category`, {
      method: "PUT",
      body: JSON.stringify({ expense_category_id }),
    }),
  updateExpenseExpectation: (id, expense_expectation) =>
    request(`/expenses/${id}/expectation`, {
      method: "PUT",
      body: JSON.stringify({ expense_expectation }),
    }),
  getDebts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/debts${suffix}`);
  },
  addDebt: (payload) =>
    request("/debts", { method: "POST", body: JSON.stringify(payload) }),
  updateDebt: (id, payload) =>
    request(`/debts/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  payoffDebtByOrigin: (payload) =>
    request("/debts/payoff", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  importDebtCsv: (payload) =>
    request("/debts/import-csv", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteDebt: (id) => request(`/debts/${id}`, { method: "DELETE" }),
  updateDebtCategory: (id, debt_category_id) =>
    request(`/debts/${id}/category`, {
      method: "PUT",
      body: JSON.stringify({ debt_category_id }),
    }),
  getLoanOriginConfigs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/loan-origin-configs${suffix}`);
  },
  getInstitutions: () => request("/institutions"),
  createInstitution: (payload) =>
    request("/institutions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateInstitution: (id, payload) =>
    request(`/institutions/${encodeURIComponent(String(id))}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteInstitution: (id) =>
    request(`/institutions/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
    }),
  saveLoanOriginConfig: (payload) =>
    request("/loan-origin-configs", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteLoanOriginConfig: (loan_origin) =>
    request(`/loan-origin-configs/${encodeURIComponent(loan_origin)}`, {
      method: "DELETE",
    }),
  getDebtOrigins: (params = {}) => {
    const query = new URLSearchParams();
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/debt-origins${suffix}`);
  },
  getLifeInsurances: (params = {}) => {
    const query = new URLSearchParams();
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/life-insurances${suffix}`);
  },
  addLifeInsurance: (payload) =>
    request("/life-insurances", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateLifeInsurance: (id, payload) =>
    request(`/life-insurances/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteLifeInsurance: (id) =>
    request(`/life-insurances/${id}`, {
      method: "DELETE",
    }),
  getBalance: (params = {}) => {
    const query = new URLSearchParams();
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/balance${suffix}`);
  },
  getBudgets: (params = {}) => {
    const query = new URLSearchParams();
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/budgets${suffix}`);
  },
  addBudget: (payload) =>
    request("/budgets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateBudget: (id, payload) =>
    request(`/budgets/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteBudget: (id) =>
    request(`/budgets/${id}`, {
      method: "DELETE",
    }),
  getEntities: () => request("/entities"),
  createEntity: (payload) =>
    request("/entities", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateEntity: (id, payload) =>
    request(`/entities/${encodeURIComponent(String(id))}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteEntity: (id) =>
    request(`/entities/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
    }),
  getEntityAccounts: (entityId) =>
    request(`/entities/${encodeURIComponent(String(entityId))}/accounts`),
  getAccounts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/accounts${suffix}`);
  },
  createAccount: (payload) =>
    request("/accounts", { method: "POST", body: JSON.stringify(payload) }),
  updateAccount: (id, payload) =>
    request(`/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteAccount: (id) =>
    request(`/accounts/${id}`, {
      method: "DELETE",
    }),
  getTransactions: (params = {}) => {
    const query = new URLSearchParams();
    if (params.account_id) {
      query.set("account_id", String(params.account_id));
    }
    if (params.type) {
      query.set("type", String(params.type));
    }
    if (params.date_from) {
      query.set("date_from", String(params.date_from));
    }
    if (params.date_to) {
      query.set("date_to", String(params.date_to));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/transactions${suffix}`);
  },
  getTransfers: (params = {}) => {
    const query = new URLSearchParams();
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    if (params.date_from) {
      query.set("date_from", String(params.date_from));
    }
    if (params.date_to) {
      query.set("date_to", String(params.date_to));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/transfers${suffix}`);
  },
  createTransfer: (payload) =>
    request("/transfers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteTransfer: (id, params = {}) => {
    const query = new URLSearchParams();
    if (params.source_type) {
      query.set("source_type", String(params.source_type));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/transfers/${encodeURIComponent(String(id))}${suffix}`, {
      method: "DELETE",
    });
  },
  createTransaction: (payload) =>
    request("/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateTransaction: (id, payload) =>
    request(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteTransaction: (id) =>
    request(`/transactions/${id}`, {
      method: "DELETE",
    }),
  getExpenseCategories: () => request("/expense-categories"),
  getExpenseSuggestions: () => request("/expense-suggestions"),
  saveExpenseSuggestion: (payload) =>
    request("/expense-suggestions", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteExpenseSuggestion: (category, expense_category_id = null) => {
    const query = new URLSearchParams();
    if (
      expense_category_id !== null &&
      expense_category_id !== undefined &&
      expense_category_id !== ""
    ) {
      query.set("expense_category_id", String(expense_category_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/expense-suggestions/${encodeURIComponent(category)}${suffix}`, {
      method: "DELETE",
    });
  },
  getCategories: () => request("/categories"),
  addCategory: (payload) =>
    request("/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCategory: (id, payload) =>
    request(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: "DELETE" }),
  getIncomeCategories: () => request("/income-categories"),
  addIncomeCategory: (payload) =>
    request("/income-categories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateIncomeCategoryRecord: (id, payload) =>
    request(`/income-categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteIncomeCategory: (id) =>
    request(`/income-categories/${id}`, { method: "DELETE" }),
  getRecurringItems: (params = {}) => {
    const query = new URLSearchParams();
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/recurring-items${suffix}`);
  },
  getPendingRecurringItems: (params = {}) => {
    const query = new URLSearchParams();
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/recurring-items/pending${suffix}`);
  },
  addRecurringItem: (payload) =>
    request("/recurring-items", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateRecurringItem: (id, payload) =>
    request(`/recurring-items/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  confirmRecurringItem: (id) =>
    request(`/recurring-items/${id}/confirm`, { method: "POST" }),
  skipRecurringItem: (id) =>
    request(`/recurring-items/${id}/skip`, { method: "POST" }),
  deleteRecurringItem: (id) =>
    request(`/recurring-items/${id}`, { method: "DELETE" }),
  getMonthlyReports: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) {
      query.set("page", String(params.page));
    }
    if (params.page_size) {
      query.set("page_size", String(params.page_size));
    }
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/monthly-reports${suffix}`);
  },
  getMonthlyReport: (month_key, params = {}) => {
    const query = new URLSearchParams();
    if (params.transactions_page) {
      query.set("transactions_page", String(params.transactions_page));
    }
    if (params.transactions_page_size) {
      query.set("transactions_page_size", String(params.transactions_page_size));
    }
    if (params.category) {
      query.set("category", String(params.category));
    }
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/monthly-reports/${encodeURIComponent(month_key)}${suffix}`);
  },
  generateMonthlyReport: (month_key = null, params = {}) => {
    const query = new URLSearchParams();
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const body = month_key ? { month_key } : {};
    if (params.entity_id) {
      body.entity_id = String(params.entity_id);
    }
    return request(`/monthly-reports/generate${suffix}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  getProjectionScenarios: (params = {}) => {
    const query = new URLSearchParams();
    if (params.workspace_id) {
      query.set("workspace_id", String(params.workspace_id));
    }
    if (params.entity_id) {
      query.set("entity_id", String(params.entity_id));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/projection-scenarios${suffix}`);
  },
  previewProjectionScenario: (payload) =>
    request("/projection-scenarios/preview", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createProjectionScenario: (payload) =>
    request("/projection-scenarios", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getProjectionScenario: (id) =>
    request(`/projection-scenarios/${encodeURIComponent(String(id))}`),
  updateProjectionScenario: (id, payload) =>
    request(`/projection-scenarios/${encodeURIComponent(String(id))}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteProjectionScenario: (id) =>
    request(`/projection-scenarios/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
    }),
  duplicateProjectionScenario: (id) =>
    request(`/projection-scenarios/${encodeURIComponent(String(id))}/duplicate`, {
      method: "POST",
    }),
  exportCsv: (dataset) =>
    requestFile(`/exports/${encodeURIComponent(dataset)}`),
};
