const { app } = require("electron");

const Application = require("./main/application/Application");

const application = new Application();

// Execute the createWindow function when the app is ready
app.whenReady().then(() => {
  application.start();
}).catch((error) => {
  console.error("Failed to start the application:", error);
  app.quit();
});
