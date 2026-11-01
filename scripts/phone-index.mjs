// Capacitor loads index.html from the build folder. The single-page build writes the
// app shell as _shell.html, so copy it to index.html once the phone build is done.
import { copyFileSync } from "node:fs";

const outDir = ".output/public";
copyFileSync(`${outDir}/_shell.html`, `${outDir}/index.html`);
console.log(`Copied ${outDir}/_shell.html to ${outDir}/index.html`);
