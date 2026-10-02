import { ANALYTICS_REQUEST_PATTERNS, TEST_ORDER_TOKEN_HEADER_NAME } from "../config/testOrder.config.mjs";

/**
 * Додає заголовок тестового замовлення лише до запиту оформлення
 * (testOrder.createOrderUrlPattern): решта запитів сайту лишається як у покупця,
 * а секрет не йде на сторонні домени.
 */
export async function attachTestOrderToken(page, { createOrderUrlPattern, testOrderToken }) {
  await page.route(createOrderUrlPattern, async (createOrderRoute) => {
    const requestHeaders = { ...createOrderRoute.request().headers(), [TEST_ORDER_TOKEN_HEADER_NAME]: testOrderToken };
    await createOrderRoute.continue({ headers: requestHeaders });
  });
}

/**
 * Не пускає в мережу пікселі, тег-менеджери й події вітрини: тестове
 * замовлення не має потрапити ні в рекламні кабінети, ні в воронку сайту.
 */
export async function blockAnalyticsRequests(page, siteBlockedRequestPatterns = []) {
  for (const blockedRequestPattern of [...ANALYTICS_REQUEST_PATTERNS, ...siteBlockedRequestPatterns]) {
    await page.route(blockedRequestPattern, (analyticsRoute) => analyticsRoute.abort());
  }
}
