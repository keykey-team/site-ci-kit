// Тестове замовлення на проді й перевірки через API сайту (06641). Сервер
// сайту знає ці імена за контрактом (docs/site-contract.md §5) — міняти лише разом.

// Заголовок, яким тест позначає своє замовлення. Сервер звіряє його з
// TEST_ORDER_TOKEN і за невірного значення відповідає 403, нічого не створюючи:
// тест ніколи не перетвориться на справжнє замовлення.
export const TEST_ORDER_TOKEN_HEADER_NAME = "X-Test-Order-Token";

// Підстановки в шляхах api.testOrderReadPath / api.stockReadPath з site.config.mjs.
export const API_PATH_PLACEHOLDERS = {
  orderNumber: "{orderNumber}",
  sku: "{sku}",
};

// Покупець тестового замовлення. Код «10» не належить жодному оператору
// України, тож номер нічий: CRM не надішле на нього справжньому клієнту SMS,
// а замовлення не прилипне до чужого кабінету. Той самий номер — у тестового
// покупця stage (E2E_CUSTOMER_PHONE), сервер Sana приймає його формат.
export const TEST_ORDER_BUYER = {
  firstName: "Автоперевірка",
  middleName: "",
  lastName: "Тест",
  phoneInternational: "+380100000001",
  phoneNational: "0100000001",
  email: "e2e-test-order@example.com",
  orderComment: "Тестове замовлення site-ci-kit: перевірка після викатки, скасовується автоматично",
};

// Лічильники аналітики, куди замовлення тесту не має потрапити: сервер сайту
// пропускає свої події для isTest, а браузерні тег-менеджери й пікселі тест
// просто не пускає в мережу. Свої шляхи сайт додає в testOrder.blockedRequestPatterns.
export const ANALYTICS_REQUEST_PATTERNS = [
  "**/*googletagmanager.com/**",
  "**/*google-analytics.com/**",
  "**/*analytics.google.com/**",
  "**/*doubleclick.net/**",
  "**/*connect.facebook.net/**",
  "**/*facebook.com/tr*",
  "**/*analytics.tiktok.com/**",
  "**/api/metrics/event*",
];

// Скільки чекати, поки сайт передасть тестове замовлення в CRM і скасує його
// там. Зазвичай це відбувається ще до відповіді на оформлення; 30 с — запас на
// повтори запиту до CRM при 429/503, але не довше за тайм-аут тесту.
export const TEST_ORDER_CRM_SETTLE_TIMEOUT_MS = 30_000;

// HTTP-коди, якими API сайту відповідає на прострочений чи відкликаний токен.
export const REJECTED_SESSION_HTTP_STATUSES = [401, 403];
