import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import DesignPage from "./DesignPage.jsx";
import "./styles.css";
import "./tailwind.css";

const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
const isDesignRoute = currentPath === "/design";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isDesignRoute ? <DesignPage /> : <App />}
  </React.StrictMode>
);
