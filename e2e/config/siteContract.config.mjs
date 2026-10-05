// Що репозиторій сайту зобов'язаний надати бібліотеці (docs/site-contract.md §3).
// Бібліотека звіряє це до запуску тестів: помилка конфігу сайту — одне
// зрозуміле повідомлення, а не десяток однаково червоних тестів.

export const SITE_CONFIG_FILE_NAME = "site.config.mjs";
export const SITE_ADAPTER_FILE_NAME = "site.adapter.mjs";

// Обов'язкові поля site.config.mjs (шлях через крапку).
export const REQUIRED_SITE_CONFIG_FIELDS = [
  "siteKey",
  "baseUrls.stage",
  "baseUrls.prod",
  "keyPages",
  "categoryFilter.categoryPath",
  "categoryFilter.expectedUrlParam",
  "testProduct.path",
  "novaPoshta.cityName",
  "novaPoshta.cityRef",
  "novaPoshta.warehouseName",
  "novaPoshta.warehouseRef",
  "seo.sitemapPath",
  "seo.robotsPath",
  "seo.indexedPaths",
  // 06641: API сайту для перевірок без браузера (§3 контракту).
  "api.customerProfilePath",
  "api.testOrderReadPath",
  "api.stockReadPath",
  // 06641: тестове замовлення на проді.
  "testOrder.createOrderUrlPattern",
  "testOrder.product.path",
];

// Ключові сторінки з задачі 06640. Сайт може додати свої понад ці.
export const REQUIRED_KEY_PAGE_NAMES = ["home", "category", "product", "search"];

// Поля кожного запису keyPages.
export const REQUIRED_KEY_PAGE_FIELDS = ["path", "readySelector"];

// Іменовані експорти site.adapter.mjs — кроки сценаріїв, які на кожному
// сайті робляться своїми селекторами.
export const SITE_ADAPTER_FUNCTION_NAMES = [
  "addTestProductToCart",
  "openCheckout",
  "fillGuestBuyer",
  "chooseNovaPoshtaBranch",
  "chooseOfflinePayment",
  "submitOrder",
  "expectOrderPlaced",
  "loginCustomer",
  "expectCustomerLoggedIn",
  "logoutCustomer",
  "expectCustomerLoggedOut",
  "expectCheckoutAutofilled",
  "loginAdmin",
  "expectAdminPanel",
  "applyCategoryFilter",
  "readListedProductCount",
  // 06641: сума кошика, номер замовлення, кабінет, токен сесії, список замовлень в адмінці.
  "readCartTotal",
  "readPlacedOrderNumber",
  "expectOrderInCustomerAccount",
  "readCustomerSessionToken",
  "expectAdminOrdersList",
];

// ---- Необов'язкова частина контракту: регресія каталогу (06646) ----------
//
// Сайт підключає її, додавши в site.config.mjs блок catalogScenario й
// експортувавши з site.adapter.mjs функції нижче. Сайт без блока чи без
// функцій ці тести пропускає з поясненням — тому це сумісна зміна (v2.x), а не
// нова обов'язкова функція адаптера.
export const CATALOG_SCENARIO_CONFIG_KEY = "catalogScenario";

// Поля catalogScenario (шлях через крапку), без яких сценарії не мають даних.
export const CATALOG_SCENARIO_REQUIRED_FIELDS = [
  "categoryPath",
  "filteredSizeLabel",
  "filteredSizeUrlFragment",
  "sortUrlFragments.cheapestFirst",
  "sortUrlFragments.mostExpensiveFirst",
  "variantProduct.path",
  "variantProduct.firstSize.label",
  "variantProduct.firstSize.priceUah",
  "variantProduct.secondSize.label",
  "variantProduct.secondSize.priceUah",
  "variantProduct.soldOutSizeLabel",
  "emptyResultPath",
];

// Ключі порядку сортування: їх отримує applyCatalogSort і ними названі поля
// catalogScenario.sortUrlFragments.
export const CATALOG_SORT_ORDER = Object.freeze({
  cheapestFirst: "cheapestFirst",
  mostExpensiveFirst: "mostExpensiveFirst",
});

export const CATALOG_SCENARIO_ADAPTER_FUNCTION_NAMES = [
  "applyCatalogSizeFilter",
  "applyCatalogSort",
  "readListedProducts",
  "openFirstListedProduct",
  "readSelectedSizeLabel",
  "chooseProductSize",
  "readSelectedVariantOffer",
  "readOfferedSizeLabels",
  "expectCatalogEmptyState",
  "resetCatalogFilters",
];

// ---- Необов'язкова частина контракту: регресія другого пріоритету (06649) --
//
// Чотири незалежні сценарії. Кожен сайт підключає окремо: блок у
// site.config.mjs (configKey) + функції в site.adapter.mjs. Немає блока чи
// функцій — тести цього сценарію пропускаються з поясненням (як і регресія
// каталогу вище), решта набору не змінюється.
//   requiredFields       — поля блока (шлях через крапку), без яких немає даних;
//   adapterFunctionNames — кроки, які сценарій викликає понад обов'язкові;
//   contractSection      — розділ docs/site-contract.md, куди веде пояснення пропуску.
export const OPTIONAL_SCENARIO_CONTRACT = Object.freeze({
  // Два варіанти одного товару в кошику: дві позиції, у кожної своє фото,
  // розмір і колір, сума — сума двох цін.
  cartVariants: Object.freeze({
    configKey: "cartVariantsScenario",
    contractSection: "§7",
    requiredFields: [
      "productPath",
      "productName",
      "firstVariant.optionLabel",
      "firstVariant.priceUah",
      "secondVariant.optionLabel",
      "secondVariant.priceUah",
    ],
    adapterFunctionNames: ["addProductVariantToCart", "readCartRows"],
  }),

  // Правка ціни й залишку в адмінці видна покупцеві; із залишком 0 товар не купити.
  adminCatalogEdit: Object.freeze({
    configKey: "adminCatalogEditScenario",
    contractSection: "§8",
    requiredFields: [
      "productPath",
      "adminProductKey",
      "optionLabel",
      "sku",
      "seededOffer.priceUah",
      "seededOffer.stockQuantity",
      "editedOffer.priceUah",
      "editedOffer.stockQuantity",
    ],
    adapterFunctionNames: ["editProductOfferInAdmin", "readStorefrontOffer"],
  }),

  // Шлях каталог → замовлення на телефоні (проєкт mobile-webkit).
  mobileCheckout: Object.freeze({
    configKey: "mobileCheckoutScenario",
    contractSection: "§9",
    requiredFields: ["categoryPath", "productName", "optionLabel"],
    adapterFunctionNames: ["openListedProductByName", "addOpenedProductToCart"],
  }),

  // Онлайн-оплата тестовою карткою зі знижкою (промокод або бонуси).
  onlinePayment: Object.freeze({
    configKey: "onlinePaymentScenario",
    contractSection: "§10",
    requiredFields: ["paymentProvider"],
    adapterFunctionNames: [
      "applyCheckoutDiscount",
      "readCheckoutTotalToPay",
      "chooseOnlineCardPayment",
      "submitOrderForOnlinePayment",
      "readThankYouOrderTotal",
    ],
  }),
});

// Секрети — лише з env раннера, ніколи з конфігу сайту (§3 контракту).
export const SECRET_ENV_NAMES = {
  basicAuthUser: "E2E_BASIC_AUTH_USER",
  basicAuthPassword: "E2E_BASIC_AUTH_PASSWORD",
  customerPhone: "E2E_CUSTOMER_PHONE",
  customerOtpCode: "E2E_CUSTOMER_OTP_CODE",
  adminLogin: "E2E_ADMIN_LOGIN",
  adminPassword: "E2E_ADMIN_PASSWORD",
  // Секрет тестового замовлення (TEST_ORDER_TOKEN сервера сайту): ним же
  // відкривається читання замовлення й залишку через API для перевірки.
  testOrderToken: "E2E_TEST_ORDER_TOKEN",
};
