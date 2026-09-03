const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

module.exports = defineConfig({
  root: "src/renderer",
  base: "./",

  plugins: [react()],
});
