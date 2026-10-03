// Необов'язкова регресія каталогу (06646): чи підключив її сайт і перевірки,
// спільні для сценаріїв каталогу.
import {
  CATALOG_SCENARIO_ADAPTER_FUNCTION_NAMES,
  CATALOG_SCENARIO_CONFIG_KEY,
  CATALOG_SCENARIO_REQUIRED_FIELDS,
  SITE_ADAPTER_FILE_NAME,
  SITE_CONFIG_FILE_NAME,
} from "../config/siteContract.config.mjs";

function readFieldByPath(sourceObject, fieldPath) {
  return fieldPath.split(".").reduce((parentObject, fieldName) => parentObject?.[fieldName], sourceObject);
}

const isFilledField = (fieldValue) => fieldValue !== undefined && fieldValue !== null && fieldValue !== "";

/**
 * Чому сценарії каталогу на цьому сайті запустити не можна; null — можна.
 *
 * Немає блока catalogScenario — сайт регресію каталогу не підключав, і це не
 * помилка. Блок є, але неповний, або бракує функцій адаптера — теж пропуск, а
 * не падіння всього запуску: причина з переліком видна у звіті.
 */
export function describeCatalogScenarioGap(siteConfig, siteAdapter) {
  const catalogScenario = siteConfig?.[CATALOG_SCENARIO_CONFIG_KEY];
  if (!catalogScenario) {
    return `В ${SITE_CONFIG_FILE_NAME} нет блока ${CATALOG_SCENARIO_CONFIG_KEY} — сайт не подключил регрессию каталога (docs/site-contract.md §6)`;
  }

  const missingConfigFields = CATALOG_SCENARIO_REQUIRED_FIELDS.filter(
    (fieldPath) => !isFilledField(readFieldByPath(catalogScenario, fieldPath)),
  );
  if (missingConfigFields.length > 0) {
    return `${SITE_CONFIG_FILE_NAME}: в ${CATALOG_SCENARIO_CONFIG_KEY} не заполнены ${missingConfigFields.join(", ")}`;
  }

  const missingAdapterFunctions = CATALOG_SCENARIO_ADAPTER_FUNCTION_NAMES.filter(
    (functionName) => typeof siteAdapter?.[functionName] !== "function",
  );
  if (missingAdapterFunctions.length > 0) {
    return `${SITE_ADAPTER_FILE_NAME} не экспортирует ${missingAdapterFunctions.join(", ")} — шаги регрессии каталога (docs/site-contract.md §6)`;
  }

  return null;
}

/** Назви товарів видачі в порядку показу. */
export const readListedProductNames = (listedProducts) => listedProducts.map((listedProduct) => listedProduct.name);

/** Ціни товарів видачі в порядку показу, грн. */
export const readListedProductPrices = (listedProducts) => listedProducts.map((listedProduct) => listedProduct.priceUah);

/** Чи йдуть числа за неспаданням. */
export const isSortedAscending = (numbers) => numbers.every((number, index) => index === 0 || numbers[index - 1] <= number);

/** Чи йдуть числа за незростанням. */
export const isSortedDescending = (numbers) => numbers.every((number, index) => index === 0 || numbers[index - 1] >= number);
