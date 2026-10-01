import { SITE_ADAPTER_FILE_NAME, SITE_ADAPTER_FUNCTION_NAMES } from "../config/siteContract.config.mjs";
import { importSiteModule } from "./siteModuleImport.mjs";

let siteAdapterPromise = null;

/** Функції контракту, яких site.adapter.mjs не експортує. */
export function listMissingAdapterFunctions(siteAdapterModule) {
  return SITE_ADAPTER_FUNCTION_NAMES.filter((functionName) => typeof siteAdapterModule?.[functionName] !== "function");
}

async function importAndValidateSiteAdapter() {
  const siteAdapterModule = await importSiteModule(SITE_ADAPTER_FILE_NAME);
  const missingFunctionNames = listMissingAdapterFunctions(siteAdapterModule);
  if (missingFunctionNames.length > 0) {
    throw new Error(
      `${SITE_ADAPTER_FILE_NAME} не экспортирует функции: ${missingFunctionNames.join(", ")}. ` +
        "Нужны все функции контракта (docs/site-contract.md §3); шаг, который сайт пока не умеет, " +
        "может бросать понятную ошибку — см. examples/site-e2e/site.adapter.mjs",
    );
  }
  return siteAdapterModule;
}

/** Кроки сценаріїв сайту з <SITE_E2E_DIR>/site.adapter.mjs, перевірені на повноту. */
export function loadSiteAdapter() {
  siteAdapterPromise ??= importAndValidateSiteAdapter();
  return siteAdapterPromise;
}
