import {
  CORS_PREFLIGHT_METHOD,
  DEFAULT_NOVA_POSHTA_WAREHOUSE_NUMBER,
  HTTP_STATUS_NO_CONTENT,
  NOVA_POSHTA_API_URL_PATTERN,
  NOVA_POSHTA_BRANCH_TYPE_DESCRIPTION,
  NOVA_POSHTA_BRANCH_WAREHOUSE_TYPE_REF,
  NOVA_POSHTA_CITY_TYPE_DESCRIPTION,
  NOVA_POSHTA_CORS_HEADERS,
  NOVA_POSHTA_METHOD_NAMES,
  NOVA_POSHTA_TEXT_LOCALE,
  NOVA_POSHTA_WAREHOUSE_CATEGORY,
  NOVA_POSHTA_WAREHOUSE_STATUS,
} from "../config/novaPoshtaStub.config.mjs";

// Порожні поля відповіді НП: сайти читають лише success/data/errors, але
// повна форма відповіді захищає від розбору на кшталт response.info.totalCount.
function wrapNovaPoshtaSuccess(directoryRecords) {
  return {
    success: true,
    data: directoryRecords,
    errors: [],
    warnings: [],
    info: { totalCount: directoryRecords.length },
    messageCodes: [],
    errorCodes: [],
    warningCodes: [],
    infoCodes: [],
  };
}

function wrapNovaPoshtaFailure(failureText) {
  return { ...wrapNovaPoshtaSuccess([]), success: false, errors: [failureText] };
}

function normalizeDirectoryText(directoryText) {
  return String(directoryText).toLocaleLowerCase(NOVA_POSHTA_TEXT_LOCALE);
}

function startsWithIgnoringCase(fullText, searchText) {
  return normalizeDirectoryText(fullText).startsWith(normalizeDirectoryText(searchText));
}

function includesIgnoringCase(fullText, searchText) {
  return normalizeDirectoryText(fullText).includes(normalizeDirectoryText(searchText));
}

function buildAreaRecords(novaPoshta) {
  if (!novaPoshta.areaRef) return [];
  return [{ Ref: novaPoshta.areaRef, Description: novaPoshta.areaName, AreasCenter: novaPoshta.cityRef }];
}

function isConfiguredCityRequested(novaPoshta, methodProperties) {
  const searchText = methodProperties.FindByString ?? methodProperties.CityName;
  if (searchText && !startsWithIgnoringCase(novaPoshta.cityName, searchText)) return false;
  if (methodProperties.Ref && methodProperties.Ref !== novaPoshta.cityRef) return false;
  if (methodProperties.AreaRef && novaPoshta.areaRef && methodProperties.AreaRef !== novaPoshta.areaRef) return false;
  return true;
}

function buildCityRecords(novaPoshta, methodProperties) {
  if (!isConfiguredCityRequested(novaPoshta, methodProperties)) return [];
  return [
    {
      Ref: novaPoshta.cityRef,
      Description: novaPoshta.cityName,
      DescriptionRu: novaPoshta.cityName,
      Area: novaPoshta.areaRef ?? "",
      AreaDescription: novaPoshta.areaName ?? "",
      SettlementTypeDescription: NOVA_POSHTA_CITY_TYPE_DESCRIPTION,
    },
  ];
}

function buildSettlementSearchRecords(novaPoshta, methodProperties) {
  if (!isConfiguredCityRequested(novaPoshta, methodProperties)) return [{ TotalCount: 0, Addresses: [] }];
  return [
    {
      TotalCount: 1,
      Addresses: [
        {
          Present: novaPoshta.cityName,
          MainDescription: novaPoshta.cityName,
          Area: novaPoshta.areaName ?? "",
          Ref: novaPoshta.settlementRef ?? novaPoshta.cityRef,
          DeliveryCity: novaPoshta.cityRef,
          Warehouses: 1,
        },
      ],
    },
  ];
}

function isConfiguredWarehouseRequested(novaPoshta, methodProperties, warehouseTypeRef) {
  const requestedCityRef = methodProperties.CityRef ?? methodProperties.SettlementRef;
  const configuredCityRefs = [novaPoshta.cityRef, novaPoshta.settlementRef].filter(Boolean);
  if (requestedCityRef && !configuredCityRefs.includes(requestedCityRef)) return false;
  if (methodProperties.CityName && !startsWithIgnoringCase(novaPoshta.cityName, methodProperties.CityName)) return false;
  if (methodProperties.TypeOfWarehouseRef && methodProperties.TypeOfWarehouseRef !== warehouseTypeRef) return false;
  if (methodProperties.FindByString && !includesIgnoringCase(novaPoshta.warehouseName, methodProperties.FindByString)) {
    return false;
  }
  return true;
}

function buildWarehouseRecords(novaPoshta, methodProperties) {
  const warehouseTypeRef = novaPoshta.warehouseTypeRef ?? NOVA_POSHTA_BRANCH_WAREHOUSE_TYPE_REF;
  if (!isConfiguredWarehouseRequested(novaPoshta, methodProperties, warehouseTypeRef)) return [];
  return [
    {
      Ref: novaPoshta.warehouseRef,
      Description: novaPoshta.warehouseName,
      DescriptionRu: novaPoshta.warehouseName,
      ShortAddress: novaPoshta.warehouseName,
      Number: novaPoshta.warehouseNumber ?? DEFAULT_NOVA_POSHTA_WAREHOUSE_NUMBER,
      CityRef: novaPoshta.cityRef,
      CityDescription: novaPoshta.cityName,
      SettlementRef: novaPoshta.settlementRef ?? novaPoshta.cityRef,
      SettlementDescription: novaPoshta.cityName,
      SettlementAreaDescription: novaPoshta.areaName ?? "",
      TypeOfWarehouse: warehouseTypeRef,
      CategoryOfWarehouse: NOVA_POSHTA_WAREHOUSE_CATEGORY,
      WarehouseStatus: NOVA_POSHTA_WAREHOUSE_STATUS,
    },
  ];
}

function buildWarehouseTypeRecords(novaPoshta) {
  return [
    {
      Ref: novaPoshta.warehouseTypeRef ?? NOVA_POSHTA_BRANCH_WAREHOUSE_TYPE_REF,
      Description: NOVA_POSHTA_BRANCH_TYPE_DESCRIPTION,
    },
  ];
}

const DIRECTORY_RECORD_BUILDERS = {
  [NOVA_POSHTA_METHOD_NAMES.getAreas]: buildAreaRecords,
  [NOVA_POSHTA_METHOD_NAMES.getCities]: buildCityRecords,
  [NOVA_POSHTA_METHOD_NAMES.getSettlements]: buildCityRecords,
  [NOVA_POSHTA_METHOD_NAMES.searchSettlements]: buildSettlementSearchRecords,
  [NOVA_POSHTA_METHOD_NAMES.getWarehouses]: buildWarehouseRecords,
  [NOVA_POSHTA_METHOD_NAMES.getWarehouseTypes]: buildWarehouseTypeRecords,
};

/** Відповідь «як від НП» на запит сайту — з даних novaPoshta у site.config.mjs. */
export function buildNovaPoshtaResponse(novaPoshtaRequest, novaPoshta) {
  const calledMethod = novaPoshtaRequest?.calledMethod;
  const buildDirectoryRecords = DIRECTORY_RECORD_BUILDERS[calledMethod];
  if (!buildDirectoryRecords) {
    return wrapNovaPoshtaFailure(`site-ci-kit: метод Новой почты "${calledMethod}" не подменён (lib/novaPoshtaStub.mjs)`);
  }
  return wrapNovaPoshtaSuccess(buildDirectoryRecords(novaPoshta, novaPoshtaRequest.methodProperties ?? {}));
}

function readNovaPoshtaRequest(interceptedRequest) {
  try {
    return interceptedRequest.postDataJSON() ?? {};
  } catch {
    return {};
  }
}

/** Підміняє API Нової пошти на сторінці: smoke не залежить від доступності НП. */
export async function stubNovaPoshtaApi(page, novaPoshta) {
  await page.route(NOVA_POSHTA_API_URL_PATTERN, async (route) => {
    const interceptedRequest = route.request();
    if (interceptedRequest.method() === CORS_PREFLIGHT_METHOD) {
      await route.fulfill({ status: HTTP_STATUS_NO_CONTENT, headers: NOVA_POSHTA_CORS_HEADERS });
      return;
    }
    await route.fulfill({
      headers: NOVA_POSHTA_CORS_HEADERS,
      json: buildNovaPoshtaResponse(readNovaPoshtaRequest(interceptedRequest), novaPoshta),
    });
  });
}
