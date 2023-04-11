/*
 * This script is injected upon reinstall. It is injected using execute script, rather than as a content script,
 * so some chrome APIs aren't present. If you don't rely on any chrome APIs, you can reinject your actual content
 * script instead.
 */

import { createRoot } from "react-dom/client";
import "../content/App.css"; // Reusing our css from the content script

const rootElement = document.getElementById("crx-root");

const OnInstallPage = () => {
  return (
    <div className={"crx-App"}>
      <div className={"crx-Content"}>
        <div>New version installed! </div>
        <div className={"crx-Button"} onClick={() => window.location.reload()}>
          Reload page
        </div>
      </div>
    </div>
  );
};

if (rootElement !== null) {
  const root = createRoot(rootElement);
  root.render(<OnInstallPage />);
} else {
  console.error("Failed to find root element.");
}
