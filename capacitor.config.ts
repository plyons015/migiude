import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.migiude.app",
  appName: "Migiude",
  webDir: "out",
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    LocalNotifications: {
      iconColor: "#7c3aed",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
  // Dev live reload (uncomment and set your LAN IP while running `npm run dev`):
  // server: { url: "http://192.168.1.x:3000", cleartext: true },
};

export default config;
