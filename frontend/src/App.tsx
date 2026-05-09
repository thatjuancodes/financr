import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { FinanceDataProvider, useFinanceData } from "./contexts/FinanceDataContext";
import { NoticeBanner } from "./components/feature/PageState";

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <FinanceDataProvider>
        <BrowserRouter basename={__BASE_PATH__}>
          <AppFrame />
        </BrowserRouter>
      </FinanceDataProvider>
    </I18nextProvider>
  );
}

function AppFrame() {
  const { error, notice, clearNotice } = useFinanceData();

  return (
    <>
      <div className="fixed left-0 right-0 top-4 z-[70] mx-auto flex max-w-3xl flex-col gap-2 px-4">
        {notice ? (
          <NoticeBanner tone="success" message={notice} onClose={clearNotice} />
        ) : null}
        {error ? <NoticeBanner tone="error" message={error} /> : null}
      </div>
      <AppRoutes />
    </>
  );
}

export default App;
