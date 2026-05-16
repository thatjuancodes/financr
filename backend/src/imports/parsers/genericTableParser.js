const MONTH_LOOKUP = new Map([
  ["jan", 1],
  ["january", 1],
  ["feb", 2],
  ["february", 2],
  ["mar", 3],
  ["march", 3],
  ["apr", 4],
  ["april", 4],
  ["may", 5],
  ["jun", 6],
  ["june", 6],
  ["jul", 7],
  ["july", 7],
  ["aug", 8],
  ["august", 8],
  ["sep", 9],
  ["sept", 9],
  ["september", 9],
  ["oct", 10],
  ["october", 10],
  ["nov", 11],
  ["november", 11],
  ["dec", 12],
  ["december", 12],
]);

const HEADER_KEYWORDS = [
  "date",
  "description",
  "details",
  "particulars",
  "debit",
  "credit",
  "amount",
  "balance",
  "posted",
];

const SKIP_LINE_PATTERNS = [
  /statement period/i,
  /^page\s+\d+/i,
  /^total\s+/i,
  /^subtotal\s+/i,
  /^opening balance/i,
  /^closing balance/i,
  /^available balance/i,
  /^running balance/i,
  /^beginning balance/i,
  /^ending balance/i,
];

const DATE_REGEX =
  /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2}(?:,\s*\d{4}|\s+\d{4})?)\b/g;
const MONEY_REGEX =
  /(?:-\s*)?(?:PHP\s*)?(?:₱\s*)?(?:-\s*)?(?:\(\s*)?\d{1,3}(?:,\d{3})*(?:\.\d{2})(?:\s*\))?/gi;

const EXPENSE_HINTS = [
  "debit",
  "withdrawal",
  "withdraw",
  "purchase",
  "payment",
  "pos",
  "dr",
  "bill",
];

const INCOME_HINTS = [
  "credit",
  "deposit",
  "salary",
  "payroll",
  "refund",
  "received",
  "cr",
  "interest",
];

const TRANSFER_HINTS = [
  "transfer",
  "instapay",
  "pesonet",
  "fund transfer",
  "online transfer",
  "bank transfer",
];
const MOBILE_UI_SKIP_PATTERNS = [
  /^deposit accounts$/i,
  /^savings account$/i,
  /^current account$/i,
  /^available balance$/i,
  /^amount$/i,
  /^[0-9]{8,}$/i,
  /^[«<\-—]+$/i,
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function toIsoDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseDateToken(token, fallbackYear) {
  const normalized = String(token || "").trim();
  if (!normalized) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }
  const slashMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    if (first > 12 && second <= 12) {
      return toIsoDate(year, second, first);
    }
    return toIsoDate(year, first, second);
  }
  const dayMonthYearMatch = normalized.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (dayMonthYearMatch) {
    const day = Number(dayMonthYearMatch[1]);
    const month = MONTH_LOOKUP.get(dayMonthYearMatch[2].toLowerCase());
    const year = Number(dayMonthYearMatch[3]);
    return toIsoDate(year, month, day);
  }
  const monthDayYearMatch = normalized.match(
    /^([A-Za-z]{3,9})\s+(\d{1,2})(?:,\s*(\d{4})|\s+(\d{4}))?$/
  );
  if (monthDayYearMatch) {
    const month = MONTH_LOOKUP.get(monthDayYearMatch[1].toLowerCase());
    const day = Number(monthDayYearMatch[2]);
    const year = Number(monthDayYearMatch[3] || monthDayYearMatch[4] || fallbackYear);
    return toIsoDate(year, month, day);
  }
  return null;
}

function parseMoneyToCents(token) {
  const normalized = String(token || "").trim();
  if (!normalized) {
    return null;
  }
  const isNegative = normalized.includes("(") || normalized.includes("-");
  const digits = normalized.replace(/PHP|₱|\(|\)|,|\s/gi, "");
  const absoluteValue = Number(digits.replace(/^-/, ""));
  if (!Number.isFinite(absoluteValue)) {
    return null;
  }
  const cents = Math.round(absoluteValue * 100);
  return isNegative ? -cents : cents;
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function detectHeader(lines) {
  const headerLine = lines.slice(0, 8).find((line) => {
    const lower = line.toLowerCase();
    const hitCount = HEADER_KEYWORDS.filter((keyword) => lower.includes(keyword)).length;
    return hitCount >= 2;
  });
  const lower = String(headerLine || "").toLowerCase();
  return {
    hasHeader: Boolean(headerLine),
    hasBalanceColumn: lower.includes("balance"),
    hasDebitCreditColumns: lower.includes("debit") && lower.includes("credit"),
    hasPostedDate: lower.includes("posted"),
  };
}

function extractDateMatches(line, fallbackYear) {
  const matches = [];
  for (const token of String(line || "").match(DATE_REGEX) || []) {
    const isoDate = parseDateToken(token, fallbackYear);
    if (isoDate) {
      matches.push({ token, isoDate });
    }
  }
  return matches;
}

function extractMoneyMatches(line) {
  return (String(line || "").match(MONEY_REGEX) || [])
    .map((token) => ({
      token,
      amountCents: parseMoneyToCents(token),
    }))
    .filter((entry) => Number.isInteger(entry.amountCents));
}

function isStandaloneMonthHeader(line) {
  return /^[A-Za-z]{3,9}\s+\d{1,2}$/i.test(String(line || "").trim());
}

function lineShouldBeSkipped(line, headerInfo) {
  const normalized = String(line || "").trim();
  if (!normalized) {
    return true;
  }
  if (SKIP_LINE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }
  if (
    headerInfo.hasHeader &&
    HEADER_KEYWORDS.filter((keyword) => normalized.toLowerCase().includes(keyword)).length >= 3
  ) {
    return true;
  }
  return false;
}

function chooseAmount(moneyMatches, headerInfo) {
  if (moneyMatches.length === 0) {
    return null;
  }

  if (headerInfo.hasDebitCreditColumns) {
    const amounts = moneyMatches.map((entry) => entry.amountCents);
    if (headerInfo.hasBalanceColumn) {
      if (amounts.length >= 3) {
        const debit = amounts[amounts.length - 3];
        const credit = amounts[amounts.length - 2];
        if (debit && !credit) {
          return { amountCents: -Math.abs(debit), inferredType: "expense" };
        }
        if (credit && !debit) {
          return { amountCents: Math.abs(credit), inferredType: "income" };
        }
        const selected = debit || credit;
        if (selected) {
          return {
            amountCents: debit ? -Math.abs(selected) : Math.abs(selected),
            inferredType: debit ? "expense" : "income",
          };
        }
      }
      if (amounts.length >= 2) {
        return {
          amountCents: amounts[0],
          inferredType: amounts[0] < 0 ? "expense" : "income",
        };
      }
    } else if (amounts.length >= 2) {
      const debit = amounts[amounts.length - 2];
      const credit = amounts[amounts.length - 1];
      if (debit && !credit) {
        return { amountCents: -Math.abs(debit), inferredType: "expense" };
      }
      if (credit && !debit) {
        return { amountCents: Math.abs(credit), inferredType: "income" };
      }
    }
  }

  return {
    amountCents: moneyMatches[moneyMatches.length - 1].amountCents,
    inferredType: null,
  };
}

function normalizeDescription(line, dateMatches, moneyMatches) {
  let description = String(line || "");
  dateMatches.forEach((match) => {
    description = description.replace(match.token, " ");
  });
  moneyMatches.forEach((match) => {
    description = description.replace(match.token, " ");
  });
  return description.replace(/\s{2,}/g, " ").trim();
}

function isLikelyUiNoise(line) {
  const normalized = normalizeWhitespace(line);
  if (!normalized) {
    return true;
  }
  if (MOBILE_UI_SKIP_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }
  if (normalized.length <= 2) {
    return true;
  }
  return false;
}

function shouldSkipMobileBlock(title, subtitle, currentDate) {
  const description = normalizeWhitespace([title, subtitle].filter(Boolean).join(" ")).toLowerCase();
  if (
    description.includes("deposit accounts") ||
    description.includes("available balance") ||
    description.includes("savings account")
  ) {
    return true;
  }
  if (!currentDate && /smart|volte|37%|3:2\d/i.test(description)) {
    return true;
  }
  return false;
}

function findAccountMatch(description, accounts, selectedAccountId) {
  const normalizedDescription = String(description || "").toLowerCase();
  if (!normalizedDescription) {
    return null;
  }
  const candidates = Array.isArray(accounts) ? accounts : [];
  return (
    candidates.find((account) => {
      if (selectedAccountId && Number(account.id) === Number(selectedAccountId)) {
        return false;
      }
      const name = String(account.name || "").trim().toLowerCase();
      if (!name || name.length < 3) {
        return false;
      }
      return normalizedDescription.includes(name);
    }) || null
  );
}

function classifyCandidate({
  description,
  amountSelection,
  accountMatch,
}) {
  const normalizedDescription = String(description || "").toLowerCase();
  const absoluteAmount = Math.abs(Number(amountSelection?.amountCents || 0));
  let candidateType = "unknown";
  let amountCents = Number(amountSelection?.amountCents || 0);

  if (accountMatch && TRANSFER_HINTS.some((hint) => normalizedDescription.includes(hint))) {
    candidateType = "transfer";
    amountCents = absoluteAmount;
  } else if (amountSelection?.inferredType === "expense") {
    candidateType = "expense";
    amountCents = -absoluteAmount;
  } else if (amountSelection?.inferredType === "income") {
    candidateType = "income";
    amountCents = absoluteAmount;
  } else if (amountCents < 0) {
    candidateType = "expense";
  } else if (amountCents > 0) {
    if (EXPENSE_HINTS.some((hint) => normalizedDescription.includes(hint))) {
      candidateType = "expense";
      amountCents = -absoluteAmount;
    } else if (INCOME_HINTS.some((hint) => normalizedDescription.includes(hint))) {
      candidateType = "income";
      amountCents = absoluteAmount;
    } else {
      candidateType = "unknown";
    }
  }

  return {
    candidateType,
    amountCents,
  };
}

function classifyMobileStatementCandidate({
  title,
  subtitle,
  amountCents,
  accountMatch,
}) {
  const description = normalizeWhitespace([title, subtitle].filter(Boolean).join(" "));
  const normalized = description.toLowerCase();
  const absoluteAmount = Math.abs(Number(amountCents || 0));

  if (accountMatch && TRANSFER_HINTS.some((hint) => normalized.includes(hint))) {
    return {
      candidateType: "transfer",
      amountCents: absoluteAmount,
      description,
      merchant: normalizeWhitespace(title),
    };
  }

  if (normalized.includes("fund transfer") || normalized.includes("elink payment")) {
    return {
      candidateType: amountCents < 0 ? "expense" : "income",
      amountCents: amountCents < 0 ? -absoluteAmount : absoluteAmount,
      description,
      merchant: normalizeWhitespace(title),
    };
  }

  if (normalized.includes("instapay transfer fee")) {
    return {
      candidateType: "expense",
      amountCents: -absoluteAmount,
      description,
      merchant: normalizeWhitespace(title),
    };
  }

  if (normalized.includes("purchase")) {
    return {
      candidateType: "expense",
      amountCents: -absoluteAmount,
      description,
      merchant: normalizeWhitespace(title.replace(/^purchase\s*-\s*/i, "")) || normalizeWhitespace(title),
    };
  }

  if (amountCents < 0) {
    return {
      candidateType: "expense",
      amountCents: -absoluteAmount,
      description,
      merchant: normalizeWhitespace(title),
    };
  }

  return {
    candidateType: "income",
    amountCents: absoluteAmount,
    description,
    merchant: normalizeWhitespace(title),
  };
}

function computeConfidence({ hasDate, hasDescription, hasAmount, candidateType, explicitType }) {
  let score = 0.15;
  if (hasDate) {
    score += 0.25;
  }
  if (hasDescription) {
    score += 0.25;
  }
  if (hasAmount) {
    score += 0.2;
  }
  if (candidateType !== "unknown") {
    score += explicitType ? 0.15 : 0.08;
  }
  return Number(Math.min(0.99, score).toFixed(2));
}

function parseMobileStatementBlocks(rawText, context = {}) {
  const lines = String(rawText || "")
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
  const fallbackYear = Number(
    String(context?.statementYear || new Date().getUTCFullYear())
  );
  const selectedAccountId = context?.accountId ? Number(context.accountId) : null;
  const selectedAccount = Array.isArray(context?.accounts)
    ? context.accounts.find((account) => Number(account.id) === selectedAccountId) || null
    : null;
  const selectedEntityId =
    String(context?.entityId || selectedAccount?.entity_id || "").trim() || null;

  const candidates = [];
  let currentDate = null;
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (isStandaloneMonthHeader(line)) {
      currentDate = parseDateToken(line, fallbackYear);
      index += 1;
      continue;
    }

    if (isLikelyUiNoise(line)) {
      index += 1;
      continue;
    }

    const sameLineMoneyMatches = extractMoneyMatches(line);
    if (sameLineMoneyMatches.length > 0 && sameLineMoneyMatches[0].token === line) {
      index += 1;
      continue;
    }

    const title = line;
    const blockLines = [];
    let amountEntry = null;
    let cursor = index + 1;

    while (cursor < lines.length) {
      const nextLine = lines[cursor];
      if (isStandaloneMonthHeader(nextLine)) {
        break;
      }
      if (isLikelyUiNoise(nextLine)) {
        cursor += 1;
        continue;
      }
      const moneyMatches = extractMoneyMatches(nextLine);
      if (moneyMatches.length > 0) {
        amountEntry = moneyMatches[moneyMatches.length - 1];
        cursor += 1;
        break;
      }
      if (blockLines.length >= 2 && /^[A-Za-z0-9].+/i.test(nextLine)) {
        break;
      }
      blockLines.push(nextLine);
      cursor += 1;
    }

    if (!amountEntry) {
      index += 1;
      continue;
    }

    const subtitle = blockLines.join(" ");
    if (shouldSkipMobileBlock(title, subtitle, currentDate)) {
      index = cursor;
      continue;
    }
    const description = normalizeWhitespace([title, subtitle].filter(Boolean).join(" "));
    const accountMatch = findAccountMatch(description, context?.accounts, selectedAccountId);
    const classification = classifyMobileStatementCandidate({
      title,
      subtitle,
      amountCents: amountEntry.amountCents,
      accountMatch,
    });

    candidates.push({
      status: currentDate ? "pending" : "needs_review",
      candidate_type: currentDate ? classification.candidateType : "unknown",
      transaction_date: currentDate,
      posted_date: null,
      description: classification.description,
      merchant: classification.merchant,
      amount_cents: classification.amountCents,
      currency_code: String(context?.currencyCode || "PHP").toUpperCase(),
      suggested_entity_id: selectedEntityId,
      suggested_account_id: selectedAccountId,
      suggested_to_account_id: accountMatch ? Number(accountMatch.id) : null,
      suggested_category_id: null,
      confidence_score: currentDate ? 0.82 : 0.58,
      duplicate_of_type: null,
      duplicate_of_id: null,
      raw_line: normalizeWhitespace([title, ...blockLines, amountEntry.token].join(" | ")),
      raw_json: JSON.stringify({
        parser: "mobile_statement_parser:v1",
        title,
        subtitle,
        amount_token: amountEntry.token,
      }),
    });

    index = cursor;
  }

  return candidates;
}

function parseGenericTable(rawText, context = {}) {
  const lines = String(rawText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const headerInfo = detectHeader(lines);
  const fallbackYear = Number(
    String(context?.statementYear || new Date().getUTCFullYear())
  );
  const selectedAccountId = context?.accountId ? Number(context.accountId) : null;
  const selectedAccount = Array.isArray(context?.accounts)
    ? context.accounts.find((account) => Number(account.id) === selectedAccountId) || null
    : null;
  const selectedEntityId =
    String(
      context?.entityId ||
        selectedAccount?.entity_id ||
        ""
    ).trim() || null;

  const candidates = [];

  lines.forEach((line) => {
    if (lineShouldBeSkipped(line, headerInfo)) {
      return;
    }

    const dateMatches = extractDateMatches(line, fallbackYear);
    const moneyMatches = extractMoneyMatches(line);
    if (dateMatches.length === 0 || moneyMatches.length === 0) {
      return;
    }

    const amountSelection = chooseAmount(moneyMatches, headerInfo);
    if (!amountSelection || !Number.isInteger(amountSelection.amountCents)) {
      return;
    }

    const description = normalizeDescription(line, dateMatches, moneyMatches);
    if (!description || description.length < 2) {
      return;
    }

    const accountMatch = findAccountMatch(description, context?.accounts, selectedAccountId);
    const classification = classifyCandidate({
      description,
      amountSelection,
      accountMatch,
    });
    const candidateType = classification.candidateType;
    const status =
      candidateType === "unknown" ? "needs_review" : "pending";
    const confidenceScore = computeConfidence({
      hasDate: true,
      hasDescription: Boolean(description),
      hasAmount: true,
      candidateType,
      explicitType: amountSelection.inferredType !== null,
    });

    candidates.push({
      status,
      candidate_type: candidateType,
      transaction_date: dateMatches[0]?.isoDate || null,
      posted_date:
        headerInfo.hasPostedDate && dateMatches[1]?.isoDate
          ? dateMatches[1].isoDate
          : dateMatches.length > 1
            ? dateMatches[1].isoDate
            : null,
      description,
      merchant: description,
      amount_cents: classification.amountCents,
      currency_code: String(context?.currencyCode || "PHP").toUpperCase(),
      suggested_entity_id: selectedEntityId,
      suggested_account_id: selectedAccountId,
      suggested_to_account_id: accountMatch ? Number(accountMatch.id) : null,
      suggested_category_id: null,
      confidence_score: confidenceScore,
      duplicate_of_type: null,
      duplicate_of_id: null,
      raw_line: line,
      raw_json: JSON.stringify({
        parser: "generic_table_parser:v1",
        header: headerInfo,
        date_tokens: dateMatches.map((entry) => entry.token),
        amount_tokens: moneyMatches.map((entry) => entry.token),
      }),
    });
  });

  return candidates;
}

module.exports = {
  parseGenericTable,
  parseMobileStatementBlocks,
};
