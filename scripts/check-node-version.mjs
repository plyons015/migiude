const major = Number(process.versions.node.split(".")[0]);
if (major < 22) {
  console.error(
    `\nUde requires Node.js 22 or newer (Capacitor 8).\n` +
      `  Current: ${process.version}\n` +
      `  Windows (nvm):  nvm install 22.22.0 && nvm use 22.22.0\n` +
      `  In this repo:   nvm use\n\n`,
  );
  process.exit(1);
}
