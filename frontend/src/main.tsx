import "@fontsource/dm-serif-display/400.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/600.css";
import "@fontsource/jost/800.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./styles/global.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { CommsProvider } from "./comms/CommsProvider";
import { SessionProvider } from "./comms/SessionProvider";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

createRoot(root).render(
  <StrictMode>
    <SessionProvider>
      <CommsProvider>
        <App />
      </CommsProvider>
    </SessionProvider>
  </StrictMode>,
);
