function normalizeDescription(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeDescription(value) {
  return new Set(
    normalizeDescription(value)
      .split(" ")
      .filter((token) => token.length >= 3)
  );
}

function scoreDescriptionSimilarity(left, right) {
  const leftTokens = tokenizeDescription(left);
  const rightTokens = tokenizeDescription(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }
  let intersectionCount = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      intersectionCount += 1;
    }
  });
  const unionCount = new Set([...leftTokens, ...rightTokens]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

function addDays(isoDate, dayCount) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setUTCDate(date.getUTCDate() + dayCount);
  return date.toISOString().slice(0, 10);
}

function daysBetween(left, right) {
  const leftDate = new Date(`${left}T00:00:00.000Z`);
  const rightDate = new Date(`${right}T00:00:00.000Z`);
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs((leftDate.getTime() - rightDate.getTime()) / 86400000);
}

function pickCandidateAccountIds(candidate) {
  const ids = [];
  if (Number.isInteger(Number(candidate?.suggested_account_id))) {
    ids.push(Number(candidate.suggested_account_id));
  }
  if (Number.isInteger(Number(candidate?.suggested_to_account_id))) {
    ids.push(Number(candidate.suggested_to_account_id));
  }
  return ids;
}

function recordMatchesAccount(candidate, record) {
  const candidateAccountIds = pickCandidateAccountIds(candidate);
  if (candidateAccountIds.length === 0) {
    return false;
  }
  const recordAccountIds = [
    Number(record?.from_account_id),
    Number(record?.to_account_id),
    Number(record?.account_id),
  ].filter((value) => Number.isInteger(value) && value > 0);
  return candidateAccountIds.some((candidateId) => recordAccountIds.includes(candidateId));
}

function buildComparisonRows({ all, workspaceId }) {
  const expenses = all(
    `
    SELECT
      'expense' AS source_type,
      CAST(e.id AS TEXT) AS source_id,
      CAST(ROUND(e.amount * 100) AS INTEGER) AS amount_cents,
      e.spent_at AS transaction_date,
      e.from_account_id,
      NULL AS to_account_id,
      COALESCE(e.notes, e.category, '') AS description
    FROM expenses e
    INNER JOIN entities ent ON ent.id = e.entity_id
    WHERE ent.workspace_id = ? AND COALESCE(e.is_transfer_bookkeeping, 0) = 0
    `,
    [workspaceId]
  );
  const income = all(
    `
    SELECT
      'income' AS source_type,
      CAST(i.id AS TEXT) AS source_id,
      CAST(ROUND(i.amount * 100) AS INTEGER) AS amount_cents,
      i.received_date AS transaction_date,
      NULL AS from_account_id,
      i.to_account_id,
      COALESCE(i.source, '') AS description
    FROM income i
    INNER JOIN entities ent ON ent.id = i.entity_id
    WHERE ent.workspace_id = ? AND COALESCE(i.is_transfer_bookkeeping, 0) = 0
    `,
    [workspaceId]
  );
  const transfers = all(
    `
    SELECT
      'transfer' AS source_type,
      CAST(tr.id AS TEXT) AS source_id,
      tr.amount_cents,
      substr(tr.transfer_date, 1, 10) AS transaction_date,
      tr.from_account_id,
      tr.to_account_id,
      COALESCE(tr.notes, '') AS description
    FROM transfers tr
    INNER JOIN accounts from_account ON from_account.id = tr.from_account_id
    INNER JOIN entities from_entity ON from_entity.id = from_account.entity_id
    INNER JOIN accounts to_account ON to_account.id = tr.to_account_id
    INNER JOIN entities to_entity ON to_entity.id = to_account.entity_id
    WHERE from_entity.workspace_id = ? OR to_entity.workspace_id = ?
    `,
    [workspaceId, workspaceId]
  );
  const transactions = all(
    `
    SELECT
      'transaction' AS source_type,
      CAST(t.id AS TEXT) AS source_id,
      t.amount_cents,
      substr(t.created_at, 1, 10) AS transaction_date,
      t.from_account_id,
      t.to_account_id,
      COALESCE(t.note, t.category, '') AS description
    FROM transactions t
    LEFT JOIN accounts from_account ON from_account.id = t.from_account_id
    LEFT JOIN entities from_entity ON from_entity.id = from_account.entity_id
    LEFT JOIN accounts to_account ON to_account.id = t.to_account_id
    LEFT JOIN entities to_entity ON to_entity.id = to_account.entity_id
    WHERE from_entity.workspace_id = ? OR to_entity.workspace_id = ?
    `,
    [workspaceId, workspaceId]
  );

  return [...expenses, ...income, ...transfers, ...transactions];
}

function applyDuplicateDetection(candidates, comparisonRows) {
  return candidates.map((candidate) => {
    const candidateAmount = Math.abs(Number(candidate?.amount_cents || 0));
    const candidateDate = String(candidate?.transaction_date || "");
    const candidateDescription = candidate?.description || candidate?.merchant || "";
    let bestMatch = null;

    comparisonRows.forEach((record) => {
      const recordAmount = Math.abs(Number(record?.amount_cents || 0));
      let score = 0;

      if (candidateAmount > 0 && candidateAmount === recordAmount) {
        score += 40;
      }
      if (recordMatchesAccount(candidate, record)) {
        score += 25;
      }
      if (candidateDate && record?.transaction_date) {
        const dateDistance = daysBetween(candidateDate, String(record.transaction_date));
        if (dateDistance <= 1) {
          score += 20;
        }
      }
      if (scoreDescriptionSimilarity(candidateDescription, record?.description || "") >= 0.5) {
        score += 15;
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          score,
          sourceType: String(record?.source_type || "transaction"),
          sourceId: String(record?.source_id || ""),
          transactionDate: record?.transaction_date || null,
        };
      }
    });

    const rawJson = safeJsonParse(candidate?.raw_json);
    const nextRawJson = {
      ...rawJson,
      duplicate_detection: bestMatch || null,
    };

    if (!bestMatch || bestMatch.score < 50) {
      return {
        ...candidate,
        raw_json: JSON.stringify(nextRawJson),
      };
    }

    return {
      ...candidate,
      status: bestMatch.score >= 75 ? "duplicate" : "needs_review",
      duplicate_of_type: bestMatch.sourceType,
      duplicate_of_id: bestMatch.sourceId,
      raw_json: JSON.stringify(nextRawJson),
    };
  });
}

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch (_error) {
    return {};
  }
}

module.exports = {
  applyDuplicateDetection,
  buildComparisonRows,
  scoreDescriptionSimilarity,
  normalizeDescription,
  addDays,
};
