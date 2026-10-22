// Оплата на тестовій (sandbox) сторінці LiqPay (06976). Правила й селектори —
// config/liqpayTestPayment.config.mjs.
import { expect } from "@playwright/test";
import {
  LIQPAY_CARD_HOLDER_FIELD_WAIT_MS,
  LIQPAY_PAGE_TIMEOUT_MS,
  LIQPAY_PAY_BUTTON_TEST_ID,
  LIQPAY_PAY_PAGE_SELECTOR,
  LIQPAY_PAY_PAGE_URL_PATTERN,
  LIQPAY_RETURN_TO_STORE_BUTTON_NAME,
  LIQPAY_SUCCESS_PAGE_URL_PATTERN,
  LIQPAY_TEST_CARD_CVV,
  LIQPAY_TEST_CARD_EXPIRY_MONTH,
  LIQPAY_TEST_CARD_HOLDER,
  LIQPAY_TEST_CARD_NUMBER,
  LIQPAY_TEST_CARD_VALID_YEARS,
} from "../config/liqpayTestPayment.config.mjs";
import { readAmountFromText } from "./amountText.mjs";

const TWO_DIGIT_YEAR_MODULO = 100;

// Строк дії тестової картки у вигляді, який набирають у полі: «1229» → «12/29».
function buildTestCardExpiryDigits(today = new Date()) {
  const expiryYear = (today.getFullYear() + LIQPAY_TEST_CARD_VALID_YEARS) % TWO_DIGIT_YEAR_MODULO;
  return `${String(LIQPAY_TEST_CARD_EXPIRY_MONTH).padStart(2, "0")}${String(expiryYear).padStart(2, "0")}`;
}

const findPayButton = (page) => page.getByTestId(LIQPAY_PAY_BUTTON_TEST_ID);

// Поле, яке LiqPay показує лише для частини карток: заповнюємо, якщо з'явилось.
async function fillCardHolderFieldIfAsked(page, fieldSelector, fieldValue) {
  const cardHolderField = page.locator(fieldSelector);
  const isFieldShown = await cardHolderField
    .waitFor({ state: "visible", timeout: LIQPAY_CARD_HOLDER_FIELD_WAIT_MS })
    .then(() => true)
    .catch(() => false);
  if (isFieldShown) await cardHolderField.fill(fieldValue);
}

/** Дочекатися сторінки оплати LiqPay (сайт сам переводить на неї після оформлення). */
export async function expectLiqpayPayPage(page) {
  await page.waitForURL(LIQPAY_PAY_PAGE_URL_PATTERN, {
    timeout: LIQPAY_PAGE_TIMEOUT_MS,
    // Сторінка LiqPay довго тягне сторонні скрипти — «load» може не настати вчасно.
    waitUntil: "domcontentloaded",
  });
  await expect(findPayButton(page)).toBeVisible({ timeout: LIQPAY_PAGE_TIMEOUT_MS });
}

/** Сума платежу, яку LiqPay збирається списати (з кнопки «Оплатити N UAH»), грн. */
export async function readLiqpayInvoiceAmountUah(page) {
  return readAmountFromText(await findPayButton(page).innerText(), "сума платежу на сторінці LiqPay");
}

/** Оплатити тестовою карткою й дочекатися сторінки успішної оплати LiqPay. */
export async function payLiqpayInvoiceWithTestCard(page) {
  // Поля з маскою: вводимо посимвольно, як покупець, — fill маску обходить.
  await page.locator(LIQPAY_PAY_PAGE_SELECTOR.cardNumberInput).pressSequentially(LIQPAY_TEST_CARD_NUMBER);
  await page.locator(LIQPAY_PAY_PAGE_SELECTOR.cardExpiryInput).pressSequentially(buildTestCardExpiryDigits());
  await page.locator(LIQPAY_PAY_PAGE_SELECTOR.cardCvvInput).pressSequentially(LIQPAY_TEST_CARD_CVV);
  await fillCardHolderFieldIfAsked(page, LIQPAY_PAY_PAGE_SELECTOR.cardHolderFirstNameInput, LIQPAY_TEST_CARD_HOLDER.firstName);
  await fillCardHolderFieldIfAsked(page, LIQPAY_PAY_PAGE_SELECTOR.cardHolderLastNameInput, LIQPAY_TEST_CARD_HOLDER.lastName);
  await findPayButton(page).click();

  await page.waitForURL(LIQPAY_SUCCESS_PAGE_URL_PATTERN, {
    timeout: LIQPAY_PAGE_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });
}

/** Повернутися на сайт кнопкою LiqPay — так само, як це робить покупець. */
export async function returnFromLiqpayToStore(page) {
  await page.getByRole("button", { name: LIQPAY_RETURN_TO_STORE_BUTTON_NAME }).click({
    timeout: LIQPAY_PAGE_TIMEOUT_MS,
  });
  await page.waitForURL((currentUrl) => !LIQPAY_PAY_PAGE_URL_PATTERN.test(currentUrl.href), {
    timeout: LIQPAY_PAGE_TIMEOUT_MS,
  });
}
