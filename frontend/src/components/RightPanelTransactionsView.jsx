import React from "react";
import RightPanelIncomeView from "./RightPanelIncomeView";
import RightPanelExpensesView from "./RightPanelExpensesView";
import RightPanelDebtView from "./RightPanelDebtView";

export default function RightPanelTransactionsView(props) {
  return (
    <div className="transactions-page-sections">
      <RightPanelIncomeView {...props.incomeViewProps} />
      <RightPanelExpensesView {...props.expensesViewProps} />
      <RightPanelDebtView {...props.debtViewProps} />
    </div>
  );
}
