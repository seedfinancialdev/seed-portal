import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handlers for React-specific errors only
window.addEventListener('unhandledrejection', (event) => {
  // Only handle promise rejections from our React app, not Vite internals
  if (event.reason && typeof event.reason === 'object' && 
      (event.reason.stack?.includes('react') || event.reason.stack?.includes('App'))) {
    console.warn('Handled React promise rejection:', event.reason);
    event.preventDefault();
  }
});

// Don't interfere with Vite's error handling
window.addEventListener('error', (event) => {
  // Only log React-specific errors, let Vite handle its own
  if (event.filename && !event.filename.includes('/@vite/') && !event.filename.includes('__dummy__')) {
    console.warn('Handled application error:', event.error);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
