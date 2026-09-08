import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SignalRProvider } from "./context/SignalRContext";
import "./styles/theme.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SignalRProvider>
        <App />
      </SignalRProvider>
    </BrowserRouter>
  </StrictMode>,
);
