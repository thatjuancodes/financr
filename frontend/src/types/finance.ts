export type EntityType = "personal" | "family" | "business";
export type TransactionType = "income" | "expense" | "transfer";
export type RecurringType = "income" | "expense" | "transfer";

export interface EntityRecord {
  id: string;
  name: string;
  type: EntityType;
}

export interface InstitutionRecord {
  id: string;
  name: string;
  type: string;
  currency_code?: string;
}

export interface AccountRecord {
  id: number;
  name: string;
  type: string;
  entity_id: string;
  entity_name: string;
  entity_type: EntityType;
  institution_id?: string | null;
  institution?: InstitutionRecord | null;
  currency_code: string;
  balance: number;
  created_at?: string;
}

export interface TransactionRecord {
  id: string | number;
  source_type: string;
  type: TransactionType;
  amount: number;
  from_account_id?: number | null;
  to_account_id?: number | null;
  from_account_name?: string | null;
  to_account_name?: string | null;
  from_entity_id?: string | null;
  from_entity_name?: string | null;
  to_entity_id?: string | null;
  to_entity_name?: string | null;
  currency_code?: string | null;
  category?: string | null;
  note?: string | null;
  created_at: string;
}

export interface IncomeRecord {
  id: number;
  amount: number;
  source: string;
  received_date: string;
  entity_id: string;
  entity_name: string;
  entity_type: EntityType;
  to_account_id?: number | null;
  to_account_name?: string | null;
  income_category_id?: number | null;
  income_category_name?: string | null;
}

export interface ExpenseRecord {
  id: number;
  amount: number;
  name: string;
  entity_id: string;
  entity_name: string;
  entity_type: EntityType;
  notes?: string | null;
  spent_at: string;
  created_at?: string;
  from_account_id?: number | null;
  from_account_name?: string | null;
  expense_category_id?: number | null;
  expense_expectation?: string | null;
  expense_category_name?: string | null;
}

export interface DebtRecord {
  id: number;
  amount: number;
  name: string;
  entity_id: string;
  entity_name: string;
  entity_type: EntityType;
  loan_origin?: string | null;
  notes?: string | null;
  spent_at: string;
  statement_month?: string | null;
  created_at?: string;
  debt_category_id?: number | null;
  debt_category_name?: string | null;
}

export interface LoanOriginConfigRecord {
  loan_origin: string;
  statement_day?: number | null;
  due_day?: number | null;
  debt_count?: number | null;
}

export interface RecurringItemRecord {
  id: number;
  type: RecurringType;
  entity_id?: string | null;
  entity_name?: string | null;
  amount: number;
  category?: string | null;
  expense_category_name?: string | null;
  income_category_name?: string | null;
  from_account_name?: string | null;
  to_account_name?: string | null;
  from_account_entity_id?: string | null;
  to_account_entity_id?: string | null;
  mirror_as_income_expense?: number | boolean;
  transfer_fee_amount?: number;
  frequency: string;
  semi_monthly_day_1?: number | null;
  semi_monthly_day_2?: number | null;
  next_due_date: string;
  last_confirmed_date?: string | null;
}

export interface CategoryRecord {
  id: number;
  name: string;
  color?: string | null;
  icon?: string | null;
}

export interface BudgetItemRecord {
  id: string;
  name: string;
  cadence: "one_time" | "monthly";
  amount: number;
  notes?: string | null;
}

export interface BudgetRecord {
  id: number;
  entity_id: string;
  entity_name: string;
  name: string;
  category?: string | null;
  target_amount: number;
  payment_plan: string;
  payment_frequency: string;
  payment_amount: number;
  payment_count?: number | null;
  start_date: string;
  target_date?: string | null;
  notes?: string | null;
  is_active: boolean;
  budget_items: BudgetItemRecord[];
  today_impact: number;
  weekly_impact: number;
  monthly_impact: number;
  one_time_total: number;
  monthly_total: number;
  item_count: number;
  elapsed_amount: number;
  remaining_amount: number;
  completed_payment_count: number;
  remaining_payment_count: number;
  scheduled_payment_count: number;
  next_payment_date?: string | null;
  next_payment_amount?: number | null;
  final_payment_date?: string | null;
  schedule_preview: Array<{ date: string; amount: number }>;
}

export interface SettingsRecord {
  base_balance: number;
  currency_code: string;
  default_expense_account_id?: number | null;
  default_income_account_id?: number | null;
  entity_default_accounts?: Array<{
    entity_id: string;
    default_expense_account_id?: number | null;
    default_income_account_id?: number | null;
  }>;
}

export interface BalanceRecord {
  base_balance: number;
  accounts_total: number;
  income_total: number;
  expense_total: number;
  debt_total: number;
  balance: number;
  upcoming_recurring_expense_total: number;
  safe_to_spend: number;
  safe_to_spend_window_days: number;
  currency_code: string;
}

export interface ProjectionResultSummary {
  final_value: number;
  total_contributions: number;
  total_interest: number;
  effective_monthly_contribution?: number;
  adjusted_monthly_net_cashflow?: number;
}

export interface ImportBatchCandidateSummary {
  total_count: number;
  pending_count: number;
  needs_review_count: number;
  duplicate_count: number;
  approved_count: number;
  rejected_count: number;
}

export interface ImportDuplicateReference {
  source_type: string;
  source_id: string;
  transaction_date: string;
  amount_cents: number;
  description?: string | null;
}

export interface ImportCandidateRecord {
  id: string;
  workspace_id: string;
  batch_id: string;
  status: "pending" | "approved" | "rejected" | "duplicate" | "needs_review";
  candidate_type: "income" | "expense" | "transfer" | "unknown";
  transaction_date?: string | null;
  posted_date?: string | null;
  description?: string | null;
  merchant?: string | null;
  amount_cents?: number | null;
  currency_code?: string | null;
  suggested_entity_id?: string | null;
  suggested_account_id?: number | null;
  suggested_to_account_id?: number | null;
  suggested_category_id?: number | null;
  confidence_score?: number | null;
  duplicate_of_type?: string | null;
  duplicate_of_id?: string | null;
  raw_line?: string | null;
  raw_json?: Record<string, unknown> | null;
  created_at: string;
  approved_at?: string | null;
  approved_by_user_id?: string | null;
  duplicate_reference?: ImportDuplicateReference | null;
}

export interface ImportFileRecord {
  id: string;
  workspace_id: string;
  batch_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  sha256_hash: string;
  created_at: string;
}

export interface ImportBatchRecord {
  id: string;
  workspace_id: string;
  created_by_user_id: string;
  source_type: "pdf" | "image";
  source_label?: string | null;
  primary_filename?: string | null;
  display_title?: string | null;
  status: "uploaded" | "extracting" | "parsed" | "failed" | "reviewed";
  parser_id?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  processed_at?: string | null;
  file_count?: number;
  summary?: ImportBatchCandidateSummary | null;
}

export interface ProjectionScenarioRecord {
  id: string;
  workspace_id: string;
  entity_id: string;
  entity_name: string;
  entity_type: EntityType;
  name: string;
  type: string;
  currency: string;
  initial_amount: number;
  annual_interest_rate: number;
  duration_months: number;
  monthly_contribution: number;
  compounding_frequency: string;
  cashflow_assumptions?: Record<string, unknown>;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  result_summary?: ProjectionResultSummary | null;
}

export interface ProjectionResultPoint {
  month: number;
  value: number;
  total_contributions: number;
  total_interest: number;
}

export interface ProjectionScenarioDetail {
  scenario: ProjectionScenarioRecord;
  result: {
    final_value: number;
    total_contributions: number;
    total_interest: number;
    effective_monthly_contribution?: number;
    adjusted_monthly_net_cashflow?: number;
    timeline: ProjectionResultPoint[];
  };
}
