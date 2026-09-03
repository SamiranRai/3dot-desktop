import { useState } from "react";

function App() {
  const [url, setUrl] = useState("");

  function navigateGo() {
    // Little Bug for intial text
    if (window.browser && url) {
      window.browser.navigate(url);
    }
  }

  function navigateBack() {
    console.log("Navigating back");
    window.browser.back();
  }

  function navigateForward() {
    console.log("Navigating forward");
    window.browser.forward();
  }

  function reloadPage() {
    console.log("Reloading page");
    window.browser.reload();
  }

  return (
    <div>
      <div>
        <button onClick={navigateBack}>←</button>

        <button onClick={navigateForward}>→</button>

        <button onClick={reloadPage}>↻</button>

        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              console.log("Enter key pressed");
              navigateGo();
            }
          }}
        />

        <button onClick={navigateGo}>Go</button>
      </div>
    </div>
  );
}

export default App;
