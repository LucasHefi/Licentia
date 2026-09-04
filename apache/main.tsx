import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import PortableApp from "../components/PortableApp";
import "../app/globals.css";

document.documentElement.dataset.licentiaStaticTarget = "true";

createRoot(document.getElementById("root")!).render(<StrictMode><PortableApp /></StrictMode>);
