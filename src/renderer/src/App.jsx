import { useState } from "react";

function App() {
  const [url, setUrl] = useState("");

  function navigate() {
    if (window.browser) {
      console.log("Navigating to:", url);
      window.browser.navigate(url);
    }
  }

  function goBack() {
    console.log("Navigating back");
    window.browser.goBack();
  }

  function goForward() {
    console.log("Navigating forward");
    window.browser.goForward();
  }

  function reload() {
    console.log("Reloading page");
    window.browser.reload();
  }

  return (
    <div>
      <div>
        <button onClick={goBack}>←</button>

        <button onClick={goForward}>→</button>

        <button onClick={reload}>↻</button>

        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              console.log("Enter key pressed");
              navigate();
            }
          }}
        />

        <button onClick={navigate}>Go</button>
      </div>
    </div>
  );
}

export default App;
