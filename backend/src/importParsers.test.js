const test = require("node:test");
const assert = require("node:assert/strict");
const { parseImportText } = require("./imports/parsers");

test("mobile statement parser extracts dated screenshot-style transaction cards", () => {
  const rawText = `
a SAMO @® + @N37%E3:23
«— Deposit accounts
SAVINGS ACCOUNT PHP 1,256.83
2269224641 Available balance

MAY 4

Fund Transfer
TO: PAOLA DOMINIQUE,A/C#3159175999
Amount -PHP 5,000.00

Purchase - MC @GRAB
Amount -PHP 614.00

4348 ELINK PAYMENT
INTER-BANK FUND TRANSFER
Amount PHP 10,000.00
  `;

  const parsed = parseImportText(rawText, { currencyCode: "PHP" });

  assert.equal(parsed.parserId, "mobile_statement_parser:v1");
  assert.equal(parsed.candidates.length, 3);

  const [transferOut, purchase, incoming] = parsed.candidates;

  assert.equal(transferOut.transaction_date, "2026-05-04");
  assert.equal(transferOut.amount_cents, -500000);
  assert.equal(transferOut.candidate_type, "expense");
  assert.match(String(transferOut.description || ""), /PAOLA DOMINIQUE/i);

  assert.equal(purchase.amount_cents, -61400);
  assert.equal(purchase.candidate_type, "expense");
  assert.equal(purchase.merchant, "MC @GRAB");

  assert.equal(incoming.amount_cents, 1000000);
  assert.equal(incoming.candidate_type, "income");
  assert.match(String(incoming.description || ""), /INTER-BANK FUND TRANSFER/i);
});
