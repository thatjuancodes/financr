export type Transaction = {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  expected?: boolean;
};

export type DebtTransaction = {
  id: string;
  date: string;
  amount: number;
  category: string;
  name: string;
  type: "debt";
};

export type Account = {
  id: string;
  balance: number;
};

export type Debt = {
  id: string;
  balance: number;
  monthlyPayment: number;
  apr?: number;
};

export type MonthlyReport = {
  summary: {
    income: number;
    expenses: number;
    net: number;
    savingsRate: number;
    incomeMoM: number;
    expenseMoM: number;
  };
  buffer: {
    current: number;
    previous: number;
    change: number;
  };
  breakdown: {
    fixed: number;
    variable: number;
    debt: number;
    savings: number;
  };
  expectedVsUnexpected: {
    expected: number;
    unexpected: number;
    expectedPercent: number;
    unexpectedPercent: number;
  };
  categories: {
    category: string;
    amount: number;
    percent: number;
    delta: number;
  }[];
  transactionsList: {
    income: Transaction[];
    expenses: Transaction[];
    debts?: DebtTransaction[];
  };
  recurring?: {
    income: number;
    expenses: number;
    expected_income_monthly: number;
    expected_income_weekly: number;
    expected_expense_monthly: number;
    expected_expense_weekly: number;
    spending_power_monthly: number;
    spending_power_weekly: number;
  };
  deltas: {
    biggestIncrease: string | null;
    biggestDecrease: string | null;
  };
  trends: {
    income: "up" | "down" | "stable";
    expenses: "up" | "down" | "stable";
    net: "up" | "down" | "stable";
  };
  debt: {
    total: number;
    monthlyPayment: number;
    dti: number;
    estimatedMonthlyInterest?: number;
    debts: Debt[];
  };
  projection: {
    month6Cash: number;
    lowestPoint: number;
    bufferAfter: number;
  };
  optimizations: {
    category: string;
    cutPercent: number;
    impact: number;
  }[];
  allowance?: {
    total: number;
    percentOfExpenses: number;
  };
};

export type GenerateMonthlyReportInput = {
  transactions: Transaction[];
  previousMonthTransactions: Transaction[];
  accounts: Account[];
  debts: Debt[];
  previousAccounts?: Account[];
  trendSeries?: {
    income?: number[];
    expenses?: number[];
    net?: number[];
  };
  options?: {
    expectedDefault?: boolean;
  };
};

// Runtime implementation lives in generateMonthlyReport.js for Node/CommonJS compatibility.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const runtime = require("./generateMonthlyReport.js");

export const generateMonthlyReport: (
  input: GenerateMonthlyReportInput
) => MonthlyReport = runtime.generateMonthlyReport;

export default generateMonthlyReport;
