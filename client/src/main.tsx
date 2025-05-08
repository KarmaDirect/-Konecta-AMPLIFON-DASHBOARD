import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import * as XLSX from "xlsx";

// Make XLSX globally available
window.XLSX = XLSX;

createRoot(document.getElementById("root")!).render(<App />);
