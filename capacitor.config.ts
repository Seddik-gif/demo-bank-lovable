import type { CapacitorConfig } from "@capacitor/cli";

// The phone app is the single-page build from `npm run build:phone`.
// appId is a placeholder: change it before publishing to an app store.
const config: CapacitorConfig = {
  appId: "com.demobank.app",
  appName: "Demo Bank",
  webDir: ".output/public",
};

export default config;
