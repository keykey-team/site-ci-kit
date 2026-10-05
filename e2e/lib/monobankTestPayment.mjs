// Оплата рахунку на тестовій сторінці monobank (06649). Правила й селектори —
// config/monobankTestPayment.config.mjs.
import { expect } from "@playwright/test";
import {
  MONOBANK_FAKE_3DS_CONFIRM_BUTTON_NAME,
  MONOBANK_PAGE_TIMEOUT_MS,
  MONOBANK_PAID_TEXT,
  MONOBANK_PAY_PAGE_SELECTOR,
  MONOBANK_PAY_PAGE_URL_PATTERN,
  MONOBANK_TEST_CARD_CVC,
  MONOBANK_TEST_CARD_EXPIRY_MONTH,
  MONOBANK_TEST_CARD_NUMBER,
  MONOBANK_TEST_CARD_VALID_YEARS,
} from "../config/monobankTestPayment.config.mjs";
import { readAmountFromText } from "./amountText.mjs";

const TWO_DIGIT_YEAR_MODULO = 100;

// Строк дії тестової картки у вигляді, який набирають у полі: «1229» → «12/29».
function buildTestCardExpiryDigits(today = new Date()) {
  const expiryYear = (today.getFullYear() + MONOBANK_TEST_CARD_VALID_YEARS) % TWO_DIGIT_YEAR_MODULO;
  return `${String(MONOBANK_TEST_CARD_EXPIRY_MONTH).padStart(2, "0")}${String(expiryYear).padStart(2, "0")}`;
}

/** Дочекатися сторінки оплати банку (сайт сам переводить на неї після оформлення). */
export async function expectMonobankPayPage(page) {
  await page.waitForURL(MONOBANK_PAY_PAGE_URL_PATTERN, { timeout: MONOBANK_PAGE_TIMEOUT_MS });
  await expect(page.locator(MONOBANK_PAY_PAGE_SELECTOR.payWithCardButton)).toBeVisible({
    timeout: MONOBANK_PAGE_TIMEOUT_MS,
  });
}

/** Сума рахунку, яку банк збирається списати (з кнопки «Оплатити N ₴»), грн. */
export async function readMonobankInvoiceAmountUah(page) {
  const payButtonText = await page.locator(MONOBANK_PAY_PAGE_SELECTOR.payWithCardButton).innerText();
  return readAmountFromText(payButtonText, "сума рахунку на сторінці monobank");
}

/** Оплатити відкритий рахунок тестовою карткою й дочекатися «Сплачено». */
export async function payMonobankInvoiceWithTestCard(page) {
  // Поля з маскою: вводимо посимвольно, як покупець, — fill маску обходить.
  await page.locator(MONOBANK_PAY_PAGE_SELECTOR.cardNumberInput).pressSequentially(MONOBANK_TEST_CARD_NUMBER);
  await page.locator(MONOBANK_PAY_PAGE_SELECTOR.cardExpiryInput).pressSequentially(buildTestCardExpiryDigits());
  await page.locator(MONOBANK_PAY_PAGE_SELECTOR.cardCvcInput).pressSequentially(MONOBANK_TEST_CARD_CVC);
  await page.locator(MONOBANK_PAY_PAGE_SELECTOR.payWithCardButton).click();

  await page
    .getByRole("button", { name: MONOBANK_FAKE_3DS_CONFIRM_BUTTON_NAME })
    .click({ timeout: MONOBANK_PAGE_TIMEOUT_MS });
  await expect(page.getByText(MONOBANK_PAID_TEXT).first(), "банк не подтвердил оплату").toBeVisible({
    timeout: MONOBANK_PAGE_TIMEOUT_MS,
  });
}

/** Повернутися на сайт кнопкою банку — так само, як це робить покупець. */
export async function returnFromMonobankToStore(page) {
  await page.locator(MONOBANK_PAY_PAGE_SELECTOR.returnToStoreButton).click();
  await page.waitForURL((currentUrl) => !MONOBANK_PAY_PAGE_URL_PATTERN.test(currentUrl.href), {
    timeout: MONOBANK_PAGE_TIMEOUT_MS,
  });
}
