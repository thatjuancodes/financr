const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createProjectionScenarioService,
} = require("./projections/projections.service");

function createService(overrides = {}) {
  const rows = new Map();
  const service = createProjectionScenarioService({
    all: async () => [],
    get: async (query, params = []) => {
      if (query.includes("FROM projection_scenarios")) {
        return rows.get(String(params[0])) || null;
      }
      return null;
    },
    run: async (query, params = []) => {
      if (query.includes("INSERT INTO projection_scenarios")) {
        rows.set(String(params[0]), {
          id: params[0],
          workspace_id: params[1],
          entity_id: params[2],
          name: params[3],
          type: params[4],
          currency: params[5],
          initial_amount: params[6],
          annual_interest_rate: params[7],
          duration_months: params[8],
          monthly_contribution: params[9],
          compounding_frequency: params[10],
          cashflow_assumptions_json: params[11],
          notes: params[12],
          created_at: params[13],
          updated_at: params[14],
        });
        return { changes: 1 };
      }
      if (query.includes("DELETE FROM projection_scenarios")) {
        return { changes: 1 };
      }
      if (query.includes("UPDATE projection_scenarios")) {
        return { changes: 1 };
      }
      return { changes: 0 };
    },
    DEFAULT_PROJECTION_WORKSPACE_ID: "default",
    getEntityById: async (entityId) =>
      entityId ? { id: entityId, name: "Entity" } : null,
    mapProjectionScenarioRow: (row) => ({
      id: String(row.id),
      workspace_id: String(row.workspace_id),
      entity_id: String(row.entity_id),
      name: String(row.name),
      type: String(row.type),
      currency: String(row.currency),
      initial_amount: Number(row.initial_amount),
      annual_interest_rate: Number(row.annual_interest_rate),
      duration_months: Number(row.duration_months),
      monthly_contribution: Number(row.monthly_contribution),
      compounding_frequency: String(row.compounding_frequency),
      cashflow_assumptions: JSON.parse(String(row.cashflow_assumptions_json || "{}")),
      notes: row.notes,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    }),
    buildProjectionResultForScenario: async () => ({
      final_value: 100,
      total_contributions: 90,
      total_interest: 10,
      timeline: [],
    }),
    buildProjectionResultSummary: (result) => ({
      final_value: result.final_value,
      total_contributions: result.total_contributions,
      total_interest: result.total_interest,
    }),
    resolveWriteEntityId: async (entityId) => entityId || "entity-1",
    validateProjectionCashflowAssumptionsReferences: async () => true,
    createUuid: () => "projection-1",
    buildProjectionResponsePayload: async (row) => ({
      scenario: {
        id: String(row.id),
        workspace_id: String(row.workspace_id),
        entity_id: String(row.entity_id),
        name: String(row.name),
        type: String(row.type),
        currency: String(row.currency),
        initial_amount: Number(row.initial_amount),
        annual_interest_rate: Number(row.annual_interest_rate),
        duration_months: Number(row.duration_months),
        monthly_contribution: Number(row.monthly_contribution),
        compounding_frequency: String(row.compounding_frequency),
        cashflow_assumptions: JSON.parse(String(row.cashflow_assumptions_json || "{}")),
        notes: row.notes,
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
      },
      result: {
        final_value: 100,
        total_contributions: 90,
        total_interest: 10,
        timeline: [],
      },
    }),
    ...overrides,
  });

  return { service, rows };
}

test("projection scenario service normalizes and creates scenario", async () => {
  const { service } = createService();

  const created = await service.create({
    workspace_id: "  demo  ",
    entity_id: " entity-1 ",
    name: "  First Projection  ",
    currency: " usd ",
    initial_amount: "1000",
    annual_interest_rate: "0.1",
    duration_months: "12",
    monthly_contribution: "250",
    notes: "  note  ",
    cashflow_assumptions: {},
  });

  assert.equal(created.workspace_id, "demo");
  assert.equal(created.entity_id, "entity-1");
  assert.equal(created.name, "First Projection");
  assert.equal(created.currency, "USD");
  assert.equal(created.initial_amount, 1000);
  assert.equal(created.annual_interest_rate, 0.1);
  assert.equal(created.duration_months, 12);
  assert.equal(created.monthly_contribution, 250);
  assert.equal(created.notes, "note");
  assert.deepEqual(created.result_summary, {
    final_value: 100,
    total_contributions: 90,
    total_interest: 10,
  });
});

test("projection scenario service rejects invalid payload before persistence", async () => {
  const { service } = createService();

  await assert.rejects(
    () =>
      service.preview({
        workspace_id: "default",
        entity_id: "entity-1",
        name: "Bad",
        initial_amount: -1,
        annual_interest_rate: 2,
        duration_months: 0,
        monthly_contribution: -5,
        cashflow_assumptions: {},
      }),
    /initial_amount must be a non-negative number/
  );
});
