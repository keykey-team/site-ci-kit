// Необов'язкові сценарії регресії (06646, 06649): чи підключив їх сайт.
//
// Сценарій підключений, коли в site.config.mjs є його блок з усіма
// обов'язковими полями, а site.adapter.mjs експортує його кроки. Інакше тест
// пропускається з поясненням — це не помилка сайту й не падіння всього запуску.
import { SITE_ADAPTER_FILE_NAME, SITE_CONFIG_FILE_NAME } from "../config/siteContract.config.mjs";

const CONTRACT_DOCUMENT_PATH = "docs/site-contract.md";

function readFieldByPath(sourceObject, fieldPath) {
  return fieldPath.split(".").reduce((parentObject, fieldName) => parentObject?.[fieldName], sourceObject);
}

const isFilledField = (fieldValue) => fieldValue !== undefined && fieldValue !== null && fieldValue !== "";

/**
 * Чому сценарій на цьому сайті запустити не можна; null — можна.
 *
 * @param {object} siteConfig default export site.config.mjs
 * @param {object} siteAdapter модуль site.adapter.mjs
 * @param {{ configKey: string, contractSection: string, requiredFields: string[], adapterFunctionNames: string[] }} scenarioContract
 * @returns {string|null}
 */
export function describeOptionalScenarioGap(siteConfig, siteAdapter, scenarioContract) {
  const { configKey, contractSection, requiredFields, adapterFunctionNames } = scenarioContract;
  const contractReference = `${CONTRACT_DOCUMENT_PATH} ${contractSection}`;

  const scenarioConfig = siteConfig?.[configKey];
  if (!scenarioConfig) {
    return `В ${SITE_CONFIG_FILE_NAME} нет блока ${configKey} — сайт не подключил этот сценарий (${contractReference})`;
  }

  const missingConfigFields = requiredFields.filter(
    (fieldPath) => !isFilledField(readFieldByPath(scenarioConfig, fieldPath)),
  );
  if (missingConfigFields.length > 0) {
    return `${SITE_CONFIG_FILE_NAME}: в ${configKey} не заполнены ${missingConfigFields.join(", ")} (${contractReference})`;
  }

  const missingAdapterFunctions = adapterFunctionNames.filter(
    (functionName) => typeof siteAdapter?.[functionName] !== "function",
  );
  if (missingAdapterFunctions.length > 0) {
    return `${SITE_ADAPTER_FILE_NAME} не экспортирует ${missingAdapterFunctions.join(", ")} — шаги сценария ${configKey} (${contractReference})`;
  }

  return null;
}
