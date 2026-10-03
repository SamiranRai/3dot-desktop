const { app } = require("electron");
const Application = require("./main/application/Application");

let application = null;

async function createApplication() {
  application = new Application();
  await application.start();
}

app
  .whenReady()
  .then(createApplication)
  .catch((error) => {
    console.error("APPLICATION: fatal startup error", error);
    app.quit();
  });

app.on("activate", async () => {
  if (!application || application.lifecycleState === "destroyed") {
    try {
      await createApplication();
    } catch (error) {
      console.error("APPLICATION: failed to recreate window", error);
    }
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  application?.shutdown();
});
