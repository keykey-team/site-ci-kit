// Підміна API Нової пошти в браузері. Сайти (Sana, Rosteria) звертаються до
// довідника НП напряму з браузера; без підміни smoke падав би щоразу, коли
// НП не відповідає, хоча сайт справний. Сервер сайту при цьому перевіряє
// справжні Ref міста й відділення — тому в site.config.mjs вони реальні.

// Будь-який запит до JSON API НП: і на корінь (/v2.0/json/), і в стилі
// /v2.0/json/Address/getCities.
export const NOVA_POSHTA_API_URL_PATTERN = /^https:\/\/api\.novaposhta\.ua\/v2\.0\/json(\/|$)/;

// Ref типу «Поштове відділення» з довідника getWarehouseTypes — однаковий для
// всіх клієнтів НП. Використовується, якщо сайт не задав warehouseTypeRef.
export const NOVA_POSHTA_BRANCH_WAREHOUSE_TYPE_REF = "841339c7-591a-42e2-8233-7a0a00f0ed6f";

// Пошук міста/відділення в НП нечутливий до регістру; мова назв — українська
// (для правильного регістру «І», «Ї», «Є»).
export const NOVA_POSHTA_TEXT_LOCALE = "uk";

export const NOVA_POSHTA_BRANCH_TYPE_DESCRIPTION = "Поштове відділення";
export const NOVA_POSHTA_CITY_TYPE_DESCRIPTION = "місто";
export const NOVA_POSHTA_WAREHOUSE_CATEGORY = "Branch";
export const NOVA_POSHTA_WAREHOUSE_STATUS = "Working";

// Номер відділення, якщо сайт не вказав warehouseNumber: частина сайтів
// показує «№1», і порожній номер ламав би підпис у списку.
export const DEFAULT_NOVA_POSHTA_WAREHOUSE_NUMBER = "1";

// Назви методів API НП, на які підміна відповідає даними з site.config.mjs.
// Інші методи отримують відповідь success:false з назвою методу: так сайт,
// що почав викликати новий метод, побачить це у звіті, а не отримає тихий
// порожній список.
export const NOVA_POSHTA_METHOD_NAMES = {
  getAreas: "getAreas",
  getCities: "getCities",
  getSettlements: "getSettlements",
  searchSettlements: "searchSettlements",
  getWarehouses: "getWarehouses",
  getWarehouseTypes: "getWarehouseTypes",
};

// Браузер шле до НП preflight OPTIONS (Content-Type: application/json з чужого
// домену). Відповідь без цих заголовків браузер відкине як CORS-помилку.
export const NOVA_POSHTA_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const HTTP_STATUS_NO_CONTENT = 204;
export const CORS_PREFLIGHT_METHOD = "OPTIONS";
