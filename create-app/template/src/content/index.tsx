import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

const rootElement = document.createElement("div");
rootElement.setAttribute("id", "crx-root");
document.body.prepend(rootElement);

if (rootElement !== null) {
  const root = createRoot(rootElement);
  root.render(<App />);
} else {
  console.error("Failed to find root element.");
}
