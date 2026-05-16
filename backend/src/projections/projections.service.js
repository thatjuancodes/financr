const { AppError } = require("../errors");
const { computeProjectionResult } = require("../engine/projectionsEngine");
const {
  normalizeProjectionScenarioFilters,
  normalizeProjectionScenarioId,
  normalizeProjectionScenarioInput,
  validateProjectionScenarioInput,
} = require("./projections.validation");

const PROJECTION_SCENARIO_SELECT = `
  SELECT
    p.id,
    p.workspace_id,
    p.entity_id,
    e.name AS entity_name,
    e.type AS entity_type,
    p.name,
    p.type,
    p.currency,
    p.initial_amount,
    p.annual_interest_rate,
    p.duration_months,
    p.monthly_contribution,
    p.compounding_frequency,
    p.cashflow_assumptions_json,
    p.notes,
    p.created_at,
    p.updated_at
  FROM projection_scenarios p
  LEFT JOIN entities e ON p.entity_id = e.id
`;

function createProjectionScenarioService(deps) {
  const {
    all,
    get,
    run,
    DEFAULT_PROJECTION_WORKSPACE_ID,
    getEntityById,
    mapProjectionScenarioRow,
    buildProjectionResultForScenario,
    buildProjectionResultSummary,
    resolveWriteEntityId,
    validateProjectionCashflowAssumptionsReferences,
    createUuid,
    buildProjectionResponsePayload,
    assertEntityInWorkspace,
  } = deps;

  async function assertEntityExists(entityId, workspaceId) {
    const entity = await getEntityById(entityId, workspaceId);
    if (!entity) {
      throw new AppError("Entity not found", 404);
    }
  }

  async function normalizeValidatedInput(input, workspaceId) {
    const normalized = normalizeProjectionScenarioInput(input, {
      defaultWorkspaceId: workspaceId || DEFAULT_PROJECTION_WORKSPACE_ID,
    });
    const resolvedEntityId = await resolveWriteEntityId(
      normalized.entity_id,
      workspaceId
    );
    const validated = validateProjectionScenarioInput({
      ...normalized,
      workspace_id: workspaceId || normalized.workspace_id,
      entity_id: resolvedEntityId,
    });
    await assertEntityExists(validated.entity_id, workspaceId);
    const validRefs = await validateProjectionCashflowAssumptionsReferences(
      validated.cashflow_assumptions
    );
    if (!validRefs) {
      throw new AppError("Invalid projection scenario payload", 400);
    }
    computeProjectionResult(validated);
    return validated;
  }

  async function getScenarioRowOrThrow(id, workspaceId) {
    const row = await get(
      `
      ${PROJECTION_SCENARIO_SELECT}
      WHERE p.id = ?
        AND p.workspace_id = ?
      LIMIT 1
      `,
      [id, workspaceId]
    );
    if (!row) {
      throw new AppError("Projection scenario not found", 404);
    }
    return row;
  }

  async function list(query = {}, workspaceId) {
    const filters = normalizeProjectionScenarioFilters(query, {
      defaultWorkspaceId: workspaceId || DEFAULT_PROJECTION_WORKSPACE_ID,
    });
    if (query.entity_id !== undefined && !filters.entity_id) {
      throw new AppError("Invalid projection filters", 400);
    }
    if (filters.entity_id) {
      await assertEntityExists(filters.entity_id, workspaceId);
    }
    const historyCache = new Map();
    const rows = await all(
      `
      ${PROJECTION_SCENARIO_SELECT}
      WHERE p.workspace_id = ?
      ${filters.entity_id ? "AND p.entity_id = ?" : ""}
      ORDER BY p.updated_at DESC, p.created_at DESC, p.name ASC
      `,
      filters.entity_id
        ? [filters.workspace_id, filters.entity_id]
        : [filters.workspace_id]
    );

    return Promise.all(
      rows.map(async (row) => {
        const scenario = mapProjectionScenarioRow(row);
        const result = await buildProjectionResultForScenario(
          scenario,
          historyCache
        );
        return {
          ...scenario,
          result_summary: buildProjectionResultSummary(result),
        };
      })
    );
  }

  async function preview(body = {}, workspaceId) {
    const validated = await normalizeValidatedInput({
      ...body,
      name: body?.name || "Preview",
    }, workspaceId);
    const result = await buildProjectionResultForScenario({
      id: "preview",
      workspace_id: validated.workspace_id,
      entity_id: validated.entity_id,
      name: validated.name,
      type: validated.type,
      currency: validated.currency,
      initial_amount: validated.initial_amount,
      annual_interest_rate: validated.annual_interest_rate,
      duration_months: validated.duration_months,
      monthly_contribution: validated.monthly_contribution,
      compounding_frequency: validated.compounding_frequency,
      cashflow_assumptions: validated.cashflow_assumptions,
      notes: validated.notes,
      created_at: "",
      updated_at: "",
    });
    return { result };
  }

  async function create(body = {}, workspaceId) {
    const validated = await normalizeValidatedInput(body, workspaceId);
    const id = createUuid();
    const now = new Date().toISOString();
    await run(
      `
      INSERT INTO projection_scenarios (
        id,
        workspace_id,
        entity_id,
        name,
        type,
        currency,
        initial_amount,
        annual_interest_rate,
        duration_months,
        monthly_contribution,
        compounding_frequency,
        cashflow_assumptions_json,
        notes,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        validated.workspace_id,
        validated.entity_id,
        validated.name,
        validated.type,
        validated.currency,
        validated.initial_amount,
        validated.annual_interest_rate,
        validated.duration_months,
        validated.monthly_contribution,
        validated.compounding_frequency,
        JSON.stringify(validated.cashflow_assumptions),
        validated.notes,
        now,
        now,
      ]
    );
    const payload = await buildProjectionResponsePayload(
      await getScenarioRowOrThrow(id, workspaceId)
    );
    return {
      ...payload.scenario,
      result_summary: buildProjectionResultSummary(payload.result),
    };
  }

  async function getById(rawId, workspaceId) {
    const id = normalizeProjectionScenarioId(rawId);
    return buildProjectionResponsePayload(await getScenarioRowOrThrow(id, workspaceId));
  }

  async function update(rawId, body = {}, workspaceId) {
    const id = normalizeProjectionScenarioId(rawId);
    const existingRow = await getScenarioRowOrThrow(id, workspaceId);
    const existing = mapProjectionScenarioRow(existingRow);
    const validated = await normalizeValidatedInput({
      workspace_id:
        body?.workspace_id === undefined ? existing.workspace_id : body.workspace_id,
      entity_id: body?.entity_id === undefined ? existing.entity_id : body.entity_id,
      name: body?.name === undefined ? existing.name : body.name,
      type: body?.type === undefined ? existing.type : body.type,
      currency: body?.currency === undefined ? existing.currency : body.currency,
      initial_amount:
        body?.initial_amount === undefined
          ? existing.initial_amount
          : body.initial_amount,
      annual_interest_rate:
        body?.annual_interest_rate === undefined
          ? existing.annual_interest_rate
          : body.annual_interest_rate,
      duration_months:
        body?.duration_months === undefined
          ? existing.duration_months
          : body.duration_months,
      monthly_contribution:
        body?.monthly_contribution === undefined
          ? existing.monthly_contribution
          : body.monthly_contribution,
      compounding_frequency:
        body?.compounding_frequency === undefined
          ? existing.compounding_frequency
          : body.compounding_frequency,
      cashflow_assumptions:
        body?.cashflow_assumptions === undefined
          ? existing.cashflow_assumptions
          : body.cashflow_assumptions,
      notes: body?.notes === undefined ? existing.notes : body.notes,
    }, workspaceId);

    const updatedAt = new Date().toISOString();
    const result = await run(
      `
      UPDATE projection_scenarios
      SET
        workspace_id = ?,
        entity_id = ?,
        name = ?,
        type = ?,
        currency = ?,
        initial_amount = ?,
        annual_interest_rate = ?,
        duration_months = ?,
        monthly_contribution = ?,
        compounding_frequency = ?,
        cashflow_assumptions_json = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?
      `,
      [
        validated.workspace_id,
        validated.entity_id,
        validated.name,
        validated.type,
        validated.currency,
        validated.initial_amount,
        validated.annual_interest_rate,
        validated.duration_months,
        validated.monthly_contribution,
        validated.compounding_frequency,
        JSON.stringify(validated.cashflow_assumptions),
        validated.notes,
        updatedAt,
        id,
      ]
    );
    if (result.changes === 0) {
      throw new AppError("Projection scenario not found", 404);
    }
    const payload = await buildProjectionResponsePayload(
      await getScenarioRowOrThrow(id, workspaceId)
    );
    return {
      ...payload.scenario,
      result_summary: buildProjectionResultSummary(payload.result),
    };
  }

  async function remove(rawId, workspaceId) {
    const id = normalizeProjectionScenarioId(rawId);
    const result = await run(
      "DELETE FROM projection_scenarios WHERE id = ? AND workspace_id = ?",
      [id, workspaceId]
    );
    if (result.changes === 0) {
      throw new AppError("Projection scenario not found", 404);
    }
    return { ok: true };
  }

  async function duplicate(rawId, workspaceId) {
    const id = normalizeProjectionScenarioId(rawId);
    const row = await getScenarioRowOrThrow(id, workspaceId);
    const scenario = mapProjectionScenarioRow(row);
    const duplicateId = createUuid();
    const now = new Date().toISOString();
    await run(
      `
      INSERT INTO projection_scenarios (
        id,
        workspace_id,
        entity_id,
        name,
        type,
        currency,
        initial_amount,
        annual_interest_rate,
        duration_months,
        monthly_contribution,
        compounding_frequency,
        cashflow_assumptions_json,
        notes,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        duplicateId,
        scenario.workspace_id,
        scenario.entity_id,
        `${scenario.name} (Copy)`,
        scenario.type,
        scenario.currency,
        scenario.initial_amount,
        scenario.annual_interest_rate,
        scenario.duration_months,
        scenario.monthly_contribution,
        scenario.compounding_frequency,
        JSON.stringify(scenario.cashflow_assumptions),
        scenario.notes,
        now,
        now,
      ]
    );
    const payload = await buildProjectionResponsePayload(
      await getScenarioRowOrThrow(duplicateId, workspaceId)
    );
    return {
      ...payload.scenario,
      result_summary: buildProjectionResultSummary(payload.result),
    };
  }

  return {
    list,
    preview,
    create,
    getById,
    update,
    remove,
    duplicate,
  };
}

module.exports = {
  createProjectionScenarioService,
};
