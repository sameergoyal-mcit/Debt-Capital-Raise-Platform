import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { RoleProvider } from "@/context/role";
import { ErrorBoundary } from "@/components/error-boundary";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <RoleProvider>
      <App />
    </RoleProvider>
  </ErrorBoundary>
);
