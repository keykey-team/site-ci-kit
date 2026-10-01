import {
  REQUIRED_KEY_PAGE_FIELDS,
  REQUIRED_KEY_PAGE_NAMES,
  REQUIRED_SITE_CONFIG_FIELDS,
  SITE_CONFIG_FILE_NAME,
} from "../config/siteContract.config.mjs";
import { importSiteModule } from "./siteModuleImport.mjs";

// Один імпорт і одна перевірка на процес: конфіг читають і playwright.config,
// і кожен spec-файл, і фікстури.
let siteConfigPromise = null;

function readFieldByPath(siteConfig, fieldPath) {
  return fieldPath.split(".").reduce((parentObject, fieldName) => parentObject?.[fieldName], siteConfig);
}

function isFilledField(fieldValue) {
  if (Array.isArray(fieldValue)) return fieldValue.length > 0;
  return fieldValue !== undefined && fieldValue !== null && fieldValue !== "";
}

function listMissingKeyPageFields(keyPages) {
  if (!keyPages || typeof keyPages !== "object") return [];
  const missingPageNames = REQUIRED_KEY_PAGE_NAMES.filter((pageName) => !keyPages[pageName]).map(
    (pageName) => `keyPages.${pageName}`,
  );
  const missingPageFields = Object.entries(keyPages).flatMap(([pageName, keyPage]) =>
    REQUIRED_KEY_PAGE_FIELDS.filter((fieldName) => !isFilledField(keyPage?.[fieldName])).map(
      (fieldName) => `keyPages.${pageName}.${fieldName}`,
    ),
  );
  return [...missingPageNames, ...missingPageFields];
}

/** Незаповнені обов'язкові поля site.config.mjs (шляхи через крапку). */
export function listMissingSiteConfigFields(siteConfig) {
  const missingTopLevelFields = REQUIRED_SITE_CONFIG_FIELDS.filter(
    (fieldPath) => !isFilledField(readFieldByPath(siteConfig, fieldPath)),
  );
  return [...missingTopLevelFields, ...listMissingKeyPageFields(siteConfig?.keyPages)];
}

async function importAndValidateSiteConfig() {
  const siteConfigModule = await importSiteModule(SITE_CONFIG_FILE_NAME);
  const siteConfig = siteConfigModule.default;
  const missingFields = listMissingSiteConfigFields(siteConfig);
  if (missingFields.length > 0) {
    throw new Error(
      `${SITE_CONFIG_FILE_NAME}: не заполнены ${missingFields.join(", ")} ` +
        "(формат — docs/site-contract.md §3, пример — examples/site-e2e/site.config.mjs)",
    );
  }
  return siteConfig;
}

/** Конфіг сайту з <SITE_E2E_DIR>/site.config.mjs, перевірений на повноту. */
export function loadSiteConfig() {
  siteConfigPromise ??= importAndValidateSiteConfig();
  return siteConfigPromise;
}
