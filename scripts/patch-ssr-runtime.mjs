import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const RUNTIME_FN = `var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
  let target = {};
  for (var name in all) __defProp(target, name, { get: all[name], enumerable: true });
  if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
  return target;
};`;

const ssrDir = join(process.cwd(), ".vercel/output/functions/__server.func/_ssr");

let patched = 0;
try {
  for (const file of readdirSync(ssrDir)) {
    if (!file.endsWith(".mjs")) continue;
    const filePath = join(ssrDir, file);
    let code = readFileSync(filePath, "utf8");

    if (!code.includes("__exportAll(")) continue;
    if (code.includes("var __exportAll")) continue;

    // Remove any import of __exportAll — we'll inline the definition instead
    // This handles the case where the import source exists at build time
    // but fails at runtime due to ESM loading order issues on Vercel
    const singleImportRe = /import\s*\{\s*\w+\s+as\s+__exportAll\s*\}\s*from\s*["'][^"']+["']\s*;?\n?/;
    const multiImportRe = /,\s*\w+\s+as\s+__exportAll/;
    const multiImportRe2 = /\w+\s+as\s+__exportAll\s*,\s*/;

    if (singleImportRe.test(code)) {
      code = code.replace(singleImportRe, "");
    } else if (multiImportRe.test(code)) {
      code = code.replace(multiImportRe, "");
    } else if (multiImportRe2.test(code)) {
      code = code.replace(multiImportRe2, "");
    }

    writeFileSync(filePath, RUNTIME_FN + "\n" + code);
    patched++;
    console.log(`[patch-ssr-runtime] Injected __exportAll into ${file}`);
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
