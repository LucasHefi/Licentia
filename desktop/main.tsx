import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LicenseStudio from "../components/LicenseStudio";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LicenseStudio />
  </StrictMode>,
);
