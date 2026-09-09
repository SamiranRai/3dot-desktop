import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const rootEL = document.getElementById("root");
if (!rootEL) {
  throw new Error("Root element #root was not found.");
}

const container = createRoot(rootEL);
container.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
