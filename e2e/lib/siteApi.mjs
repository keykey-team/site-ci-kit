import { expect } from "@playwright/test";
import { HTTP_OK_STATUS } from "../config/pageChecks.config.mjs";
import { API_PATH_PLACEHOLDERS, TEST_ORDER_TOKEN_HEADER_NAME } from "../config/testOrder.config.mjs";

// Перевірки без браузера через API сайту (06641, docs/site-contract.md §5).
// Запити йдуть від фікстури request — з тим самим baseURL і basic-auth stage.

function fillApiPath(pathTemplate, placeholder, placeholderValue) {
  return pathTemplate.replace(placeholder, encodeURIComponent(String(placeholderValue)));
}

async function readJsonOrFail(apiResponse, requestDescription) {
  const responseText = await apiResponse.text();
  expect(apiResponse.status(), `${requestDescription}: ${responseText.slice(0, 300)}`).toBe(HTTP_OK_STATUS);
  return JSON.parse(responseText);
}

/**
 * Замовлення так, як його зберіг сервер: номер, isTest, позиції (sku, quantity,
 * unitPrice), сума товарів і стан у CRM. Без персональних даних.
 */
export async function readStoredOrder(request, siteConfig, { orderNumber, testOrderToken }) {
  const orderPath = fillApiPath(siteConfig.api.testOrderReadPath, API_PATH_PLACEHOLDERS.orderNumber, orderNumber);
  const orderResponse = await request.get(orderPath, {
    headers: { [TEST_ORDER_TOKEN_HEADER_NAME]: testOrderToken },
  });
  return readJsonOrFail(orderResponse, `замовлення ${orderNumber} (${orderPath})`);
}

/** Поточний залишок варіанта на сайті — до й після тестового замовлення. */
export async function readStockQuantity(request, siteConfig, { sku, testOrderToken }) {
  const stockPath = fillApiPath(siteConfig.api.stockReadPath, API_PATH_PLACEHOLDERS.sku, sku);
  const stockResponse = await request.get(stockPath, {
    headers: { [TEST_ORDER_TOKEN_HEADER_NAME]: testOrderToken },
  });
  const { quantity } = await readJsonOrFail(stockResponse, `залишок ${sku} (${stockPath})`);
  return quantity;
}

/** HTTP-код захищеного API покупця з цим токеном: 200 — сесія жива. */
export async function readCustomerProfileStatus(request, siteConfig, customerSessionToken) {
  const profileResponse = await request.get(siteConfig.api.customerProfilePath, {
    headers: { Authorization: `Bearer ${customerSessionToken}` },
  });
  return profileResponse.status();
}
