const BANK_FEE_CATEGORY_NAME = "Misc - Bank Fees";

async function getOrCreateBankFeesCategoryId({ get, run }) {
  const existing = await get(
    "SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1",
    [BANK_FEE_CATEGORY_NAME]
  );
  const existingId = Number(existing?.id);
  if (Number.isInteger(existingId) && existingId > 0) {
    return existingId;
  }

  const result = await run(
    "INSERT INTO categories (name, color) VALUES (?, ?)",
    [BANK_FEE_CATEGORY_NAME, null]
  );
  const createdId = Number(result?.lastID);
  return Number.isInteger(createdId) && createdId > 0 ? createdId : null;
}

async function createTransferFeeExpense({
  get,
  run,
  amountCents,
  spentAt,
  entityId,
  fromAccountId,
  transferId,
}) {
  const normalizedAmountCents = Number(amountCents ?? 0);
  if (!Number.isInteger(normalizedAmountCents) || normalizedAmountCents <= 0) {
    return null;
  }

  const expenseCategoryId = await getOrCreateBankFeesCategoryId({ get, run });
  const result = await run(
    `
    INSERT INTO expenses (
      amount,
      category,
      notes,
      spent_at,
      created_at,
      expense_category_id,
      expense_expectation,
      entity_id,
      from_account_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      Number((normalizedAmountCents / 100).toFixed(2)),
      "Transfer fee",
      transferId ? `Transfer fee for transfer ${transferId}` : "Transfer fee",
      spentAt,
      new Date().toISOString(),
      expenseCategoryId,
      "expected",
      entityId,
      fromAccountId,
    ]
  );
  const expenseId = Number(result?.lastID);
  return Number.isInteger(expenseId) && expenseId > 0 ? expenseId : null;
}

module.exports = {
  BANK_FEE_CATEGORY_NAME,
  getOrCreateBankFeesCategoryId,
  createTransferFeeExpense,
};
