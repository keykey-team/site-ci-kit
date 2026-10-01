import { existsSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { RUNNER_ENV_NAMES } from "../config/runner.config.mjs";

// Хук резолву реєструється один раз на процес (головний і кожен воркер
// Playwright реєструють свій).
let isSiteDependencyResolverRegistered = false;

/** Абсолютний шлях до каталогу e2e/ репозиторію сайту (з SITE_E2E_DIR). */
export function resolveSiteE2eDirectory() {
  const configuredDirectory = process.env[RUNNER_ENV_NAMES.siteE2eDirectory];
  if (!configuredDirectory) {
    throw new Error(
      `Не задан ${RUNNER_ENV_NAMES.siteE2eDirectory} — путь к каталогу e2e/ репозитория сайта ` +
        "(site.config.mjs + site.adapter.mjs, см. docs/site-contract.md §3)",
    );
  }
  return path.resolve(configuredDirectory);
}

function registerSiteDependencyResolver(siteE2eDirectory) {
  if (isSiteDependencyResolverRegistered) return;
  register("./siteDependencyResolverHooks.mjs", import.meta.url, {
    data: {
      siteDirectoryUrl: pathToFileURL(siteE2eDirectory + path.sep).href,
      kitResolutionParentUrl: import.meta.url,
    },
  });
  isSiteDependencyResolverRegistered = true;
}

/** Імпортує файл з каталогу e2e/ сайту; голі імпорти в ньому беруться з бібліотеки. */
export async function importSiteModule(siteModuleFileName) {
  const siteE2eDirectory = resolveSiteE2eDirectory();
  const siteModulePath = path.join(siteE2eDirectory, siteModuleFileName);
  if (!existsSync(siteModulePath)) {
    throw new Error(
      `Нет файла ${siteModulePath}. Скопируйте шаблон из examples/site-e2e/ ` +
        "и заполните его (docs/site-contract.md §3)",
    );
  }
  registerSiteDependencyResolver(siteE2eDirectory);
  return import(pathToFileURL(siteModulePath).href);
}
