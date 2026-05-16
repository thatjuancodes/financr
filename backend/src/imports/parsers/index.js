const {
  parseGenericTable,
  parseMobileStatementBlocks,
} = require("./genericTableParser");

function parseImportText(rawText, context = {}) {
  const mobileCandidates = parseMobileStatementBlocks(rawText, context);
  const genericCandidates = parseGenericTable(rawText, context);

  if (genericCandidates.length > 0 && genericCandidates.length >= mobileCandidates.length) {
    return {
      parserId: "generic_table_parser:v1",
      candidates: genericCandidates,
    };
  }

  if (mobileCandidates.length > 0) {
    return {
      parserId: "mobile_statement_parser:v1",
      candidates: mobileCandidates,
    };
  }

  return {
    parserId: "generic_table_parser:v1",
    candidates: genericCandidates,
  };
}

module.exports = {
  parseImportText,
};
