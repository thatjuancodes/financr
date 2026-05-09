import { useEffect } from "react";
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

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearNotice();
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [clearNotice, notice]);

  return (
    <>
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[calc(100%-2rem)] max-w-sm flex-col items-stretch gap-2 sm:w-full">
        {notice ? (
          <div className="pointer-events-auto">
            <NoticeBanner tone="success" message={notice} onClose={clearNotice} />
          </div>
        ) : null}
        {error ? (
          <div className="pointer-events-auto">
            <NoticeBanner tone="error" message={error} />
          </div>
        ) : null}
      </div>
      <AppRoutes />
    </>
  );
}

export default App;
