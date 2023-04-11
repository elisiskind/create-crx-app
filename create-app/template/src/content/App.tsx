import "./App.css";
import { useState } from "react";

export const App = () => {
  const [showOverlay, setShowOverlay] = useState(true);

  if (!showOverlay) {
    return <></>;
  }
  return (
    <div className={"crx-App"} onClick={() => setShowOverlay(false)}>
      <div className={"crx-Content"} onClick={(e) => e.stopPropagation()}>
        <div>
          <img
            alt={"bob"}
            src={chrome.runtime.getURL("/static/bob.jpeg")}
            width={480}
          />
        </div>
        <div>To put something else here, edit "src/content/App.tsx"</div>
      </div>
    </div>
  );
};
