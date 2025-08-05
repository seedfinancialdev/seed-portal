import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Let Vite handle all error reporting - no custom global handlers

createRoot(document.getElementById("root")!).render(<App />);
