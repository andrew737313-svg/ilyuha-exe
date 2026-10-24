import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AudioProvider } from "./audio/AudioProvider";
import { Game } from "./App";
import { TextsProvider } from "./texts/TextsProvider";
import { AdminPanel } from "./texts/AdminPanel";
import "./styles/fonts.css";
import "./styles/base.css";
import "./styles/game.css";
import "./styles/admin.css";

const container = document.getElementById("root");
if (!container) throw new Error("#root not found");

createRoot(container).render(
  <StrictMode>
    <TextsProvider>
      <AudioProvider>
        <Game />
      </AudioProvider>
      <AdminPanel />
    </TextsProvider>
  </StrictMode>,
);