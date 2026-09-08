import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getContext } from "@microsoft/power-apps/app";
import App from "./App";

// Fires the SDK's handshake postMessage to the Power Apps host frame. The
// host keeps the iframe hidden until it hears from the app -- without this
// call the app never announces itself and the host shows a blank screen
// forever, even though the app itself rendered fine.
getContext().catch((err) => console.error("Power Apps SDK getContext failed", err));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
