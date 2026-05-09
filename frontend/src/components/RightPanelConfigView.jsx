import React from "react";
import Tabs from "./ui/Tabs";
import AccountsView from "./AccountsView";
import {
  DataExportSection,
  DebtStatementsSection,
  ExpenseCategoriesSection,
  GeneralSection,
  IncomeCategoriesSection,
  InstitutionsSection,
  SuggestionsSection,
} from "./RightPanelConfigSections";
import {
  DebtStatementDrawers,
  ExpenseCategoryDrawers,
  IncomeCategoryDrawers,
  InstitutionDrawers,
  SuggestionDrawer,
} from "./RightPanelConfigDrawers";

export default function RightPanelConfigView(props) {
  const { configTab, setConfigTab } = props;

  return (
    <div className="config-view">
      <Tabs
        tabs={[
          { id: "general", label: "General" },
          { id: "accounts", label: "Accounts" },
          { id: "institutions", label: "Institutions" },
          { id: "categories", label: "Expense Categories" },
          { id: "income-categories", label: "Income Categories" },
          { id: "suggestions", label: "Suggestions" },
          { id: "debt-statements", label: "Debt Statements" },
          { id: "data-export", label: "Data Export" },
        ]}
        activeId={configTab}
        onChange={setConfigTab}
      />

      {configTab === "general" && <GeneralSection {...props} />}
      {configTab === "accounts" && <AccountsView {...props.accountsViewProps} />}
      {configTab === "institutions" && <InstitutionsSection {...props} />}
      {configTab === "categories" && <ExpenseCategoriesSection {...props} />}
      {configTab === "income-categories" && <IncomeCategoriesSection {...props} />}
      {configTab === "suggestions" && <SuggestionsSection {...props} />}
      {configTab === "debt-statements" && <DebtStatementsSection {...props} />}
      {configTab === "data-export" && <DataExportSection {...props} />}

      <InstitutionDrawers {...props} />
      <DebtStatementDrawers {...props} />
      <ExpenseCategoryDrawers {...props} />
      <IncomeCategoryDrawers {...props} />
      <SuggestionDrawer {...props} />
    </div>
  );
}
