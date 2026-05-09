import { useMemo } from "react";
import { currentMonthKey, monthLabel, todayISO } from "../utils/format";
import {
  ISO_DATE,
  ALL_ENTITIES_VALUE,
  debtBelongsToStatementCycle,
  getCalendarMonthWindow,
  getDebtStatementMonth,
  getFallbackDebtStatementMonth,
  isValidMonthKey,
  normalizeMoneyValue,
  shiftMonthKey,
} from "../utils/appState";
import {
  getNextRecurringOccurrenceOnOrAfter,
  getRecurringTransferDirection,
  recurringMonthlyAmount,
} from "../utils/recurring";

function averageMonthlyTotal(items, dateField, valueSelector = (item) => item.amount ?? 0) {
  const monthlyTotals = new Map();
  items.forEach((item) => {
    const date = typeof item?.[dateField] === "string" ? item[dateField] : "";
    if (!ISO_DATE.test(date)) {
      return;
    }
    const month = date.slice(0, 7);
    monthlyTotals.set(month, (monthlyTotals.get(month) || 0) + Number(valueSelector(item)));
  });
  if (monthlyTotals.size === 0) {
    return 0;
  }
  const total = Array.from(monthlyTotals.values()).reduce(
    (sum, value) => sum + value,
    0
  );
  return normalizeMoneyValue(total / monthlyTotals.size);
}

function shiftIsoDate(dateString, days) {
  const [year, month, day] = String(dateString || "").split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return "";
  }
  const next = new Date(year, month - 1, day);
  next.setDate(next.getDate() + days);
  const nextYear = next.getFullYear();
  const nextMonth = String(next.getMonth() + 1).padStart(2, "0");
  const nextDay = String(next.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export default function useAppDashboardMetrics({
  balance,
  balanceMonth,
  balanceMonths,
  dashboardCurrentBalance,
  debtList,
  expenseList,
  incomeList,
  loanOriginConfigMap,
  recurringItems,
  selectedEntityId,
}) {
  const expenseCategoryBreakdown = useMemo(() => {
    const map = new Map();
    expenseList
      .filter((item) => (item.spent_at || "").slice(0, 7) === balanceMonth)
      .forEach((item) => {
        const key = item.expense_category_name || "Uncategorized";
        map.set(key, (map.get(key) || 0) + (item.amount ?? 0));
      });
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenseList, balanceMonth]);

  const expenseBreakdownTotal = useMemo(() => {
    return expenseList
      .filter((item) => (item.spent_at || "").slice(0, 7) === balanceMonth)
      .reduce((sum, item) => sum + (item.amount ?? 0), 0);
  }, [expenseList, balanceMonth]);

  const balanceMonthIncomeTotal = useMemo(() => {
    return incomeList
      .filter((item) => (item.received_date || "").slice(0, 7) === balanceMonth)
      .reduce((sum, item) => sum + (item.amount ?? 0), 0);
  }, [incomeList, balanceMonth]);

  const balanceMonthSavings = useMemo(() => {
    return normalizeMoneyValue(balanceMonthIncomeTotal - expenseBreakdownTotal);
  }, [balanceMonthIncomeTotal, expenseBreakdownTotal]);

  const monthlyRecurringExpenseTotal = useMemo(() => {
    return recurringItems.reduce((sum, item) => {
      if (item?.type !== "expense") {
        return sum;
      }
      return sum + recurringMonthlyAmount(item);
    }, 0);
  }, [recurringItems]);

  const monthlyRecurringIncomeTotal = useMemo(() => {
    return recurringItems.reduce((sum, item) => {
      if (item?.type !== "income") {
        return sum;
      }
      return sum + recurringMonthlyAmount(item);
    }, 0);
  }, [recurringItems]);

  const projectedMonthlySavingsGrowth = useMemo(() => {
    return normalizeMoneyValue(
      monthlyRecurringIncomeTotal - monthlyRecurringExpenseTotal
    );
  }, [monthlyRecurringIncomeTotal, monthlyRecurringExpenseTotal]);

  const currentBalanceAmount = useMemo(() => {
    const numeric =
      dashboardCurrentBalance !== null
        ? Number(dashboardCurrentBalance)
        : Number(balance?.balance ?? 0);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return normalizeMoneyValue(numeric);
  }, [balance, dashboardCurrentBalance]);

  const safeToSpendAmount = useMemo(() => {
    const upcoming = Number(balance?.upcoming_recurring_expense_total ?? 0);
    const debts = Number(balance?.debt_total ?? 0);
    if (!Number.isFinite(upcoming) || !Number.isFinite(debts)) {
      return currentBalanceAmount;
    }
    return normalizeMoneyValue(currentBalanceAmount - upcoming - debts);
  }, [balance, currentBalanceAmount]);

  const dashboardRecurringWindowStart = useMemo(() => todayISO(), []);
  const isScopedEntityDashboard =
    String(selectedEntityId || "").trim() &&
    String(selectedEntityId || "").trim() !== ALL_ENTITIES_VALUE;

  const upcomingRecurringIncomeTotal = useMemo(() => {
    let nearestDueDate = null;
    let nearestAmount = 0;
    recurringItems.forEach((item) => {
      const amount = Math.abs(Number(item?.amount ?? 0));
      if (!Number.isFinite(amount) || amount <= 0) {
        return;
      }
      let includeAsIncome = item?.type === "income";
      if (!includeAsIncome && item?.type === "transfer" && isScopedEntityDashboard) {
        includeAsIncome =
          getRecurringTransferDirection(item, selectedEntityId) === "incoming";
      }
      if (!includeAsIncome) {
        return;
      }
      const dueDate = getNextRecurringOccurrenceOnOrAfter(
        item,
        dashboardRecurringWindowStart
      );
      if (!dueDate) {
        return;
      }
      if (nearestDueDate === null || dueDate < nearestDueDate) {
        nearestDueDate = dueDate;
        nearestAmount = amount;
      }
    });
    return normalizeMoneyValue(nearestAmount);
  }, [recurringItems, isScopedEntityDashboard, selectedEntityId, dashboardRecurringWindowStart]);

  const daysBeforeNextIncome = useMemo(() => {
    let nearestDueDate = null;
    recurringItems.forEach((item) => {
      let includeAsIncome = item?.type === "income";
      if (!includeAsIncome && item?.type === "transfer" && isScopedEntityDashboard) {
        includeAsIncome =
          getRecurringTransferDirection(item, selectedEntityId) === "incoming";
      }
      if (!includeAsIncome) {
        return;
      }
      const dueDate = getNextRecurringOccurrenceOnOrAfter(
        item,
        dashboardRecurringWindowStart
      );
      if (!dueDate || (nearestDueDate && dueDate >= nearestDueDate)) {
        return;
      }
      nearestDueDate = dueDate;
    });
    if (!nearestDueDate) {
      return null;
    }
    const start = new Date(`${dashboardRecurringWindowStart}T00:00:00Z`);
    const next = new Date(`${nearestDueDate}T00:00:00Z`);
    return Math.max(0, Math.round((next.getTime() - start.getTime()) / 86400000));
  }, [recurringItems, isScopedEntityDashboard, selectedEntityId, dashboardRecurringWindowStart]);

  const sixMonthProjectionSeries = useMemo(() => {
    const startMonth = currentMonthKey();
    let runningTotal = currentBalanceAmount;
    return Array.from({ length: 6 }, (_, index) => {
      const month = shiftMonthKey(startMonth, index);
      if (index > 0) {
        runningTotal += projectedMonthlySavingsGrowth;
      }
      return {
        month_key: month,
        projected_savings: normalizeMoneyValue(runningTotal),
      };
    });
  }, [currentBalanceAmount, projectedMonthlySavingsGrowth]);

  const bufferMonths = useMemo(() => {
    if (safeToSpendAmount === null || safeToSpendAmount === undefined) {
      return null;
    }
    const safeToSpend = Number(safeToSpendAmount ?? 0);
    if (!Number.isFinite(safeToSpend) || monthlyRecurringExpenseTotal <= 0) {
      return null;
    }
    return safeToSpend / monthlyRecurringExpenseTotal;
  }, [monthlyRecurringExpenseTotal, safeToSpendAmount]);

  const balanceStatementDebts = useMemo(() => {
    return debtList.filter((item) =>
      debtBelongsToStatementCycle(item, balanceMonth, loanOriginConfigMap)
    );
  }, [debtList, balanceMonth, loanOriginConfigMap]);

  const balanceDebtTotal = useMemo(() => {
    const total = balanceStatementDebts.reduce(
      (sum, item) => sum + (item.amount ?? 0),
      0
    );
    return normalizeMoneyValue(total);
  }, [balanceStatementDebts]);

  const balanceDebtRecords = useMemo(() => {
    const rows = [...balanceStatementDebts];
    rows.sort((a, b) => {
      const dateCmp = String(b.spent_at || "").localeCompare(String(a.spent_at || ""));
      if (dateCmp !== 0) {
        return dateCmp;
      }
      const createdCmp = String(b.created_at || "").localeCompare(
        String(a.created_at || "")
      );
      if (createdCmp !== 0) {
        return createdCmp;
      }
      return Number(b.id ?? 0) - Number(a.id ?? 0);
    });
    return rows;
  }, [balanceStatementDebts]);

  const debtCategoryBreakdown = useMemo(() => {
    const grouped = new Map();
    balanceDebtRecords.forEach((item) => {
      const amount = Number(item.amount ?? 0);
      if (amount <= 0) {
        return;
      }
      const key = item.debt_category_name || "Uncategorized";
      grouped.set(key, (grouped.get(key) || 0) + amount);
    });
    return Array.from(grouped.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [balanceDebtRecords]);

  const debtCategoryBreakdownTotal = useMemo(() => {
    return debtCategoryBreakdown.reduce((sum, item) => sum + item.total, 0);
  }, [debtCategoryBreakdown]);

  const balanceTopDebtMonths = useMemo(() => {
    if (!isValidMonthKey(balanceMonth)) {
      return [shiftMonthKey(currentMonthKey(), -1), currentMonthKey()];
    }
    return [shiftMonthKey(balanceMonth, -1), balanceMonth];
  }, [balanceMonth]);

  const balanceTopDebtCategories = useMemo(() => {
    const includedMonths = new Set(balanceTopDebtMonths);
    const grouped = new Map();
    debtList.forEach((item) => {
      const month = String(item?.spent_at || "").slice(0, 7);
      if (!includedMonths.has(month)) {
        return;
      }
      const amount = Number(item?.amount ?? 0);
      if (amount <= 0) {
        return;
      }
      const category = item.debt_category_name || "Uncategorized";
      grouped.set(category, (grouped.get(category) || 0) + amount);
    });
    return Array.from(grouped.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [debtList, balanceTopDebtMonths]);

  const balanceTopDebtCategoriesTotal = useMemo(() => {
    return balanceTopDebtCategories.reduce((sum, row) => sum + row.total, 0);
  }, [balanceTopDebtCategories]);

  const balanceTopRecentDebtCategories = useMemo(() => {
    return balanceTopDebtCategories.slice(0, 5);
  }, [balanceTopDebtCategories]);

  const balanceTopRecentDebtCategoriesTotal = useMemo(() => {
    return balanceTopRecentDebtCategories.reduce((sum, row) => sum + row.total, 0);
  }, [balanceTopRecentDebtCategories]);

  const topRecentDebtPeriodLabel = useMemo(() => {
    if (balanceTopDebtMonths.length === 2) {
      return `Period: ${monthLabel(balanceTopDebtMonths[0])} + ${monthLabel(balanceTopDebtMonths[1])}`;
    }
    return "Recent means previous month + selected month, based on debt transaction date.";
  }, [balanceTopDebtMonths]);

  const balanceDebtAccumulated = useMemo(() => {
    return balanceStatementDebts.reduce((sum, item) => {
      const amount = Number(item.amount ?? 0);
      return amount > 0 ? sum + amount : sum;
    }, 0);
  }, [balanceStatementDebts]);

  const monthlyTrendSeries = useMemo(() => {
    const months = balanceMonths.slice(0, 12).reverse();
    const incomeByMonth = new Map();
    incomeList.forEach((item) => {
      const month = String(item?.received_date || "").slice(0, 7);
      if (!isValidMonthKey(month)) {
        return;
      }
      incomeByMonth.set(month, (incomeByMonth.get(month) || 0) + Number(item?.amount ?? 0));
    });

    const expenseByMonth = new Map();
    expenseList.forEach((item) => {
      const month = String(item?.spent_at || "").slice(0, 7);
      if (!isValidMonthKey(month)) {
        return;
      }
      expenseByMonth.set(
        month,
        (expenseByMonth.get(month) || 0) + Number(item?.amount ?? 0)
      );
    });

    const debtByMonth = new Map();
    debtList.forEach((item) => {
      const month = getDebtStatementMonth(item, loanOriginConfigMap);
      if (!isValidMonthKey(month)) {
        return;
      }
      const amount = Number(item?.amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        return;
      }
      debtByMonth.set(month, (debtByMonth.get(month) || 0) + amount);
    });

    return months.map((month) => ({
      month_key: month,
      income: normalizeMoneyValue(incomeByMonth.get(month) || 0),
      expenses: normalizeMoneyValue(expenseByMonth.get(month) || 0),
      debt: normalizeMoneyValue(debtByMonth.get(month) || 0),
    }));
  }, [balanceMonths, incomeList, expenseList, debtList, loanOriginConfigMap]);

  const dailyTrendSeries = useMemo(() => {
    const endDate = todayISO();
    const dates = Array.from({ length: 30 }, (_, index) =>
      shiftIsoDate(endDate, index - 29)
    );
    const includedDates = new Set(dates);
    const incomeByDate = new Map();
    incomeList.forEach((item) => {
      const date = String(item?.received_date || "");
      if (!includedDates.has(date)) {
        return;
      }
      incomeByDate.set(date, (incomeByDate.get(date) || 0) + Number(item?.amount ?? 0));
    });

    const expenseByDate = new Map();
    expenseList.forEach((item) => {
      const date = String(item?.spent_at || "");
      if (!includedDates.has(date)) {
        return;
      }
      expenseByDate.set(date, (expenseByDate.get(date) || 0) + Number(item?.amount ?? 0));
    });

    const debtByDate = new Map();
    debtList.forEach((item) => {
      const date = String(item?.spent_at || "");
      if (!includedDates.has(date)) {
        return;
      }
      const amount = Number(item?.amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        return;
      }
      debtByDate.set(date, (debtByDate.get(date) || 0) + amount);
    });

    return dates.map((date) => ({
      date_key: date,
      income: normalizeMoneyValue(incomeByDate.get(date) || 0),
      expenses: normalizeMoneyValue(expenseByDate.get(date) || 0),
      debt: normalizeMoneyValue(debtByDate.get(date) || 0),
    }));
  }, [incomeList, expenseList, debtList]);

  const monthlyBalanceSourceSeries = useMemo(() => {
    const anchorMonth = isValidMonthKey(balanceMonth)
      ? balanceMonth
      : currentMonthKey();
    const months = Array.from({ length: 12 }, (_, index) =>
      shiftMonthKey(anchorMonth, index - 11)
    );
    const incomeByMonth = new Map();
    incomeList.forEach((item) => {
      const month = String(item?.received_date || "").slice(0, 7);
      if (!isValidMonthKey(month)) {
        return;
      }
      incomeByMonth.set(month, (incomeByMonth.get(month) || 0) + Number(item?.amount ?? 0));
    });

    const expenseByMonth = new Map();
    expenseList.forEach((item) => {
      const month = String(item?.spent_at || "").slice(0, 7);
      if (!isValidMonthKey(month)) {
        return;
      }
      expenseByMonth.set(
        month,
        (expenseByMonth.get(month) || 0) + Number(item?.amount ?? 0)
      );
    });

    const debtByMonth = new Map();
    debtList.forEach((item) => {
      const month = getDebtStatementMonth(item, loanOriginConfigMap);
      if (!isValidMonthKey(month)) {
        return;
      }
      const amount = Number(item?.amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        return;
      }
      debtByMonth.set(month, (debtByMonth.get(month) || 0) + amount);
    });

    return months.map((month) => ({
      month_key: month,
      income: normalizeMoneyValue(incomeByMonth.get(month) || 0),
      expenses: normalizeMoneyValue(expenseByMonth.get(month) || 0),
      debt: normalizeMoneyValue(debtByMonth.get(month) || 0),
    }));
  }, [balanceMonth, incomeList, expenseList, debtList, loanOriginConfigMap]);

  const dailyBalanceSourceSeries = useMemo(() => {
    const today = todayISO();
    const selectedMonthWindow = getCalendarMonthWindow(balanceMonth);
    const endDate =
      balanceMonth === currentMonthKey()
        ? today
        : selectedMonthWindow?.endDate || today;
    const dates = Array.from({ length: 30 }, (_, index) =>
      shiftIsoDate(endDate, index - 29)
    );
    const includedDates = new Set(dates);
    const incomeByDate = new Map();
    incomeList.forEach((item) => {
      const date = String(item?.received_date || "");
      if (!includedDates.has(date)) {
        return;
      }
      incomeByDate.set(date, (incomeByDate.get(date) || 0) + Number(item?.amount ?? 0));
    });

    const expenseByDate = new Map();
    expenseList.forEach((item) => {
      const date = String(item?.spent_at || "");
      if (!includedDates.has(date)) {
        return;
      }
      expenseByDate.set(date, (expenseByDate.get(date) || 0) + Number(item?.amount ?? 0));
    });

    const debtByDate = new Map();
    debtList.forEach((item) => {
      const date = String(item?.spent_at || "");
      if (!includedDates.has(date)) {
        return;
      }
      const amount = Number(item?.amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        return;
      }
      debtByDate.set(date, (debtByDate.get(date) || 0) + amount);
    });

    return dates.map((date) => ({
      date_key: date,
      income: normalizeMoneyValue(incomeByDate.get(date) || 0),
      expenses: normalizeMoneyValue(expenseByDate.get(date) || 0),
      debt: normalizeMoneyValue(debtByDate.get(date) || 0),
    }));
  }, [balanceMonth, incomeList, expenseList, debtList]);

  const balanceDebtPaid = useMemo(() => {
    return debtList
      .filter((item) => (item.spent_at || "").slice(0, 7) === balanceMonth)
      .reduce((sum, item) => {
        const amount = Number(item.amount ?? 0);
        return amount < 0 ? sum + Math.abs(amount) : sum;
      }, 0);
  }, [debtList, balanceMonth]);

  const averageExpensePerMonth = useMemo(() => {
    return averageMonthlyTotal(expenseList, "spent_at");
  }, [expenseList]);

  const averageIncomePerMonth = useMemo(() => {
    return averageMonthlyTotal(incomeList, "received_date");
  }, [incomeList]);

  const averageDebtPerMonth = useMemo(() => {
    const monthlyTotals = new Map();
    debtList.forEach((item) => {
      const amount = Number(item?.amount ?? 0);
      if (!(amount > 0)) {
        return;
      }
      const statementMonthRaw =
        typeof item?.statement_month === "string" ? item.statement_month : "";
      const statementMonth = isValidMonthKey(statementMonthRaw)
        ? statementMonthRaw
        : getFallbackDebtStatementMonth(item, loanOriginConfigMap);
      if (!isValidMonthKey(statementMonth)) {
        return;
      }
      monthlyTotals.set(
        statementMonth,
        (monthlyTotals.get(statementMonth) || 0) + amount
      );
    });
    if (monthlyTotals.size === 0) {
      return 0;
    }
    const total = Array.from(monthlyTotals.values()).reduce(
      (sum, value) => sum + value,
      0
    );
    return normalizeMoneyValue(total / monthlyTotals.size);
  }, [debtList, loanOriginConfigMap]);

  const thirtyDayProjectionSeries = useMemo(() => {
    const startDate = todayISO();
    let runningTotal = currentBalanceAmount;
    const dailyGrowth = normalizeMoneyValue(projectedMonthlySavingsGrowth / 30);
    return Array.from({ length: 30 }, (_, index) => {
      const date = shiftIsoDate(startDate, index);
      if (index > 0) {
        runningTotal += dailyGrowth;
      }
      return {
        date_key: date,
        projected_savings: normalizeMoneyValue(runningTotal),
      };
    });
  }, [currentBalanceAmount, projectedMonthlySavingsGrowth]);

  const monthlyBalanceTrendSeries = useMemo(() => {
    if (monthlyBalanceSourceSeries.length === 0) {
      return [];
    }
    const balances = new Array(monthlyBalanceSourceSeries.length);
    let runningBalance = currentBalanceAmount;
    for (let index = monthlyBalanceSourceSeries.length - 1; index >= 0; index -= 1) {
      const row = monthlyBalanceSourceSeries[index];
      balances[index] = {
        month_key: row.month_key,
        balance: normalizeMoneyValue(runningBalance),
      };
      runningBalance -=
        Number(row.income ?? 0) -
        Number(row.expenses ?? 0) -
        Number(row.debt ?? 0);
    }
    return balances;
  }, [monthlyBalanceSourceSeries, currentBalanceAmount]);

  const dailyBalanceTrendSeries = useMemo(() => {
    if (dailyBalanceSourceSeries.length === 0) {
      return [];
    }
    const balances = new Array(dailyBalanceSourceSeries.length);
    let runningBalance = currentBalanceAmount;
    for (let index = dailyBalanceSourceSeries.length - 1; index >= 0; index -= 1) {
      const row = dailyBalanceSourceSeries[index];
      balances[index] = {
        date_key: row.date_key,
        balance: normalizeMoneyValue(runningBalance),
      };
      runningBalance -=
        Number(row.income ?? 0) -
        Number(row.expenses ?? 0) -
        Number(row.debt ?? 0);
    }
    return balances;
  }, [dailyBalanceSourceSeries, currentBalanceAmount]);

  return {
    averageDebtPerMonth,
    averageExpensePerMonth,
    averageIncomePerMonth,
    balanceDebtAccumulated,
    balanceDebtPaid,
    balanceDebtRecords,
    balanceDebtTotal,
    balanceMonthIncomeTotal,
    balanceMonthSavings,
    balanceStatementDebts,
    balanceTopDebtCategories,
    balanceTopDebtCategoriesTotal,
    balanceTopDebtMonths,
    balanceTopRecentDebtCategories,
    balanceTopRecentDebtCategoriesTotal,
    bufferMonths,
    currentBalanceAmount,
    debtCategoryBreakdown,
    debtCategoryBreakdownTotal,
    daysBeforeNextIncome,
    dailyBalanceTrendSeries,
    dailyTrendSeries,
    expenseBreakdownTotal,
    expenseCategoryBreakdown,
    monthlyBalanceTrendSeries,
    monthlyRecurringExpenseTotal,
    monthlyRecurringIncomeTotal,
    monthlyTrendSeries,
    upcomingRecurringIncomeTotal,
    projectedMonthlySavingsGrowth,
    safeToSpendAmount,
    sixMonthProjectionSeries,
    thirtyDayProjectionSeries,
    topRecentDebtPeriodLabel,
  };
}
