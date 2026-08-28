import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const RUNTIME = `var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
  let target = {};
  for (var name in all) __defProp(target, name, { get: all[name], enumerable: true });
  if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
  return target;
};
`;

const ssrDir = join(process.cwd(), ".vercel/output/functions/__server.func/_ssr");

let patched = 0;
try {
  for (const file of readdirSync(ssrDir)) {
    if (!file.endsWith(".mjs")) continue;
    const filePath = join(ssrDir, file);
    const code = readFileSync(filePath, "utf8");
    if (
      code.includes("__exportAll(") &&
      !code.includes("var __exportAll") &&
      !/__exportAll\s*}.*from\s/.test(code)
    ) {
      writeFileSync(filePath, RUNTIME + code);
      patched++;
      console.log(`[patch-ssr-runtime] Injected __exportAll into ${file}`);
    }
  }
} catch (e) {
  if (e.code === "ENOENT") {
    console.log("[patch-ssr-runtime] No SSR output dir found, skipping.");
  } else {
    throw e;
  }
}

if (patched === 0) {
  console.log("[patch-ssr-runtime] No files needed patching.");
} else {
  console.log(`[patch-ssr-runtime] Patched ${patched} file(s).`);
}
