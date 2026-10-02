// Global augmentation lives at root, imports each domain's API shape
import type { BrowserAPI } from "@/features/browser/api/browser.types";
// import type { AiAgentAPI } from "@/features/ai-agent/api/aiAgent.types"; // later

declare global {
  interface Window {
    browser: BrowserAPI;
    // aiAgent: AiAgentAPI; // later
  }
}

export {};
