// Необов'язкова регресія каталогу (06646): чи підключив її сайт і перевірки,
// спільні для сценаріїв каталогу.
import {
  CATALOG_SCENARIO_ADAPTER_FUNCTION_NAMES,
  CATALOG_SCENARIO_CONFIG_KEY,
  CATALOG_SCENARIO_REQUIRED_FIELDS,
} from "../config/siteContract.config.mjs";
import { describeOptionalScenarioGap } from "./optionalScenario.mjs";

const CATALOG_SCENARIO_CONTRACT = Object.freeze({
  configKey: CATALOG_SCENARIO_CONFIG_KEY,
  contractSection: "§6",
  requiredFields: CATALOG_SCENARIO_REQUIRED_FIELDS,
  adapterFunctionNames: CATALOG_SCENARIO_ADAPTER_FUNCTION_NAMES,
});

/**
 * Чому сценарії каталогу на цьому сайті запустити не можна; null — можна.
 * Правило те саме, що й для решти необов'язкових сценаріїв (optionalScenario.mjs).
 */
export function describeCatalogScenarioGap(siteConfig, siteAdapter) {
  return describeOptionalScenarioGap(siteConfig, siteAdapter, CATALOG_SCENARIO_CONTRACT);
}

/** Назви товарів видачі в порядку показу. */
export const readListedProductNames = (listedProducts) => listedProducts.map((listedProduct) => listedProduct.name);

/** Ціни товарів видачі в порядку показу, грн. */
export const readListedProductPrices = (listedProducts) => listedProducts.map((listedProduct) => listedProduct.priceUah);

/** Чи йдуть числа за неспаданням. */
export const isSortedAscending = (numbers) => numbers.every((number, index) => index === 0 || numbers[index - 1] <= number);

/** Чи йдуть числа за незростанням. */
export const isSortedDescending = (numbers) => numbers.every((number, index) => index === 0 || numbers[index - 1] >= number);
