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
