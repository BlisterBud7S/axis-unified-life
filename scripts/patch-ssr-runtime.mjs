import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";

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
    const code = readFileSync(filePath, "utf8");

    if (!code.includes("__exportAll(")) continue;
    if (code.includes("var __exportAll")) continue;

    // Check if __exportAll is imported and whether the source exists
    const importMatch = code.match(
      /import\s*\{[^}]*\bas\s+__exportAll\b[^}]*\}\s*from\s*["']([^"']+)["']/
    );

    if (importMatch) {
      const importSrc = importMatch[1];
      const resolved = resolve(dirname(filePath), importSrc);
      // Try both with and without extension
      const candidates = [resolved, resolved + ".mjs", resolved + ".js"];
      const sourceExists = candidates.some((c) => existsSync(c));

      if (sourceExists) {
        // Source file exists — check if it actually exports __exportAll
        const srcPath = candidates.find((c) => existsSync(c));
        const srcCode = readFileSync(srcPath, "utf8");
        if (srcCode.includes("__exportAll")) {
          console.log(`[patch-ssr-runtime] ${file}: import source ${importSrc} exists and exports __exportAll, skipping.`);
          continue;
        }
      }

      // Import source is missing or broken — replace the import with inline definition
      console.log(`[patch-ssr-runtime] ${file}: import source ${importSrc} missing or broken, patching.`);

      // Remove __exportAll from the import statement
      // Handle: import { a as foo, b as __exportAll, c as bar } from "..."
      let patched_code = code;

      // If __exportAll is the only import, remove the entire import line
      const singleImportRe = /import\s*\{\s*\w+\s+as\s+__exportAll\s*\}\s*from\s*["'][^"']+["']\s*;?\n?/;
      // If it's one of multiple imports, remove just the __exportAll part
      const multiImportRe = /,\s*\w+\s+as\s+__exportAll/;
      const multiImportRe2 = /\w+\s+as\s+__exportAll\s*,\s*/;

      if (singleImportRe.test(patched_code)) {
        patched_code = patched_code.replace(singleImportRe, "");
      } else if (multiImportRe.test(patched_code)) {
        patched_code = patched_code.replace(multiImportRe, "");
      } else if (multiImportRe2.test(patched_code)) {
        patched_code = patched_code.replace(multiImportRe2, "");
      }

      patched_code = RUNTIME_FN + "\n" + patched_code;
      writeFileSync(filePath, patched_code);
      patched++;
      console.log(`[patch-ssr-runtime] Injected __exportAll into ${file}`);
      continue;
    }

    // No import found but __exportAll is used — inject directly
    writeFileSync(filePath, RUNTIME_FN + "\n" + code);
    patched++;
    console.log(`[patch-ssr-runtime] Injected __exportAll into ${file} (no import found)`);
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
