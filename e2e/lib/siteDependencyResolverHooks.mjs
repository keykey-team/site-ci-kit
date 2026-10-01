// Хук резолву модулів Node (module.register). Реєструється з siteModuleImport.mjs.
//
// Навіщо: site.config.mjs і site.adapter.mjs лежать у репозиторії сайту, поза
// цим пакетом. `import { expect } from "@playwright/test"` з них Node шукав би
// в node_modules сайту — там Playwright або немає, або це друга копія, а дві
// копії в одному процесі Playwright не допускає. Тому «голі» імпорти з файлів
// сайту резолвимо так, ніби їх зробили з каталогу бібліотеки.

// Специфікатор зі схемою (node:, file:, data:) — вже конкретна адреса модуля.
const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

// На Windows шлях нечутливий до регістру (d: і D: — один диск).
const isCaseInsensitiveFileSystem = process.platform === "win32";

let siteDirectoryUrl = "";
let kitResolutionParentUrl = "";

function normalizeUrlForComparison(moduleUrl) {
  return isCaseInsensitiveFileSystem ? moduleUrl.toLowerCase() : moduleUrl;
}

function isPackageSpecifier(specifier) {
  const isRelativeOrAbsolutePath = specifier.startsWith(".") || specifier.startsWith("/");
  return !isRelativeOrAbsolutePath && !URL_SCHEME_PATTERN.test(specifier);
}

function isImportedFromSiteDirectory(parentUrl) {
  if (!parentUrl) return false;
  return normalizeUrlForComparison(parentUrl).startsWith(normalizeUrlForComparison(siteDirectoryUrl));
}

export async function initialize(resolverSettings) {
  siteDirectoryUrl = resolverSettings.siteDirectoryUrl;
  kitResolutionParentUrl = resolverSettings.kitResolutionParentUrl;
}

export async function resolve(specifier, resolveContext, nextResolve) {
  if (isPackageSpecifier(specifier) && isImportedFromSiteDirectory(resolveContext.parentURL)) {
    return nextResolve(specifier, { ...resolveContext, parentURL: kitResolutionParentUrl });
  }
  return nextResolve(specifier, resolveContext);
}
