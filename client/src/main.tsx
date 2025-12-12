import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { RoleProvider } from "@/context/role";

createRoot(document.getElementById("root")!).render(
  <RoleProvider>
    <App />
  </RoleProvider>
);
