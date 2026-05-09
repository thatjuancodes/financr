import AccountsEntityDrawers from "./AccountsEntityDrawers";
import AccountsLedgerDrawers from "./AccountsLedgerDrawers";

export default function AccountsViewDrawers(props) {
  return (
    <>
      <AccountsEntityDrawers {...props} />
      <AccountsLedgerDrawers {...props} />
    </>
  );
}
