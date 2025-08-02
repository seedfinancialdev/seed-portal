import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handlers to prevent console errors from unhandled promises
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Handled unhandled promise rejection:', event.reason);
  event.preventDefault(); // Prevent the default console error
});

window.addEventListener('error', (event) => {
  console.warn('Handled global error:', event.error);
});

createRoot(document.getElementById("root")!).render(<App />);
