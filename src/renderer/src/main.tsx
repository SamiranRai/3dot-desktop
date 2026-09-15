import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from 'react-router-dom';
import { router } from './App/routes';

const rootEL = document.getElementById("root");
if (!rootEL) {
  throw new Error("Root element #root was not found.");
}

const container = createRoot(rootEL);
container.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
