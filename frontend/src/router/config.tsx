import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import Transactions from "../pages/transactions/page";
import Recurring from "../pages/recurring/page";
import Reporting from "../pages/reporting/page";
import Forecast from "../pages/forecast/page";
import Settings from "../pages/settings/page";
import DesignSystem from "../pages/design/page";
import Notifications from "../pages/notifications/page";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/transactions",
    element: <Transactions />,
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
    path: "/notifications",
    element: <Notifications />,
  },
  {
    path: "/forecast",
    element: <Forecast />,
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
    path: "/design",
    element: <DesignSystem />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;
