import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import Transactions from "../pages/transactions/page";
import ImportsPage from "../pages/imports/page";
import ImportBatchDetailPage from "../pages/imports/detail-page";
import Recurring from "../pages/recurring/page";
import Reporting from "../pages/reporting/page";
import ReportDetailPage from "../pages/reporting/detail-page";
import Settings from "../pages/settings/page";
import DesignSystem from "../pages/design/page";
import Notifications from "../pages/notifications/page";
import LoginPage from "../pages/login/page";
import SignupPage from "../pages/signup/page";
import OnboardingPage from "../pages/onboarding/page";
import InvitePage from "../pages/invite/page";
import HouseholdPage from "../pages/household/page";
import { RequireAuth, RequireGuest, RequireOnboarding } from "./guards";

const routes: RouteObject[] = [
  {
    element: <RequireGuest />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/signup",
        element: <SignupPage />,
      },
    ],
  },
  {
    path: "/invite/:token",
    element: <InvitePage />,
  },
  {
    element: <RequireOnboarding />,
    children: [
      {
        path: "/onboarding",
        element: <OnboardingPage />,
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/transactions",
        element: <Transactions />,
      },
      {
        path: "/imports",
        element: <ImportsPage />,
      },
      {
        path: "/imports/:batchId",
        element: <ImportBatchDetailPage />,
      },
      {
        path: "/recurring",
        element: <Recurring />,
      },
      {
        path: "/reporting",
        element: <Reporting />,
      },
      {
        path: "/reporting/:monthKey",
        element: <ReportDetailPage />,
      },
      {
        path: "/notifications",
        element: <Notifications />,
      },
      {
        path: "/insights",
        element: <Navigate to="/reporting?tab=insights" replace />,
      },
      {
        path: "/automation",
        element: <Navigate to="/settings?tab=automation" replace />,
      },
      {
        path: "/settings",
        element: <Settings />,
      },
      {
        path: "/household",
        element: <HouseholdPage />,
      },
      {
        path: "/design",
        element: <DesignSystem />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;
