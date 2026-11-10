// Платіжні провайдери, чию тестову сторінку оплати бібліотека вміє пройти
// (06649, LiqPay — 06976). Сайт називає свого в onlinePaymentScenario.paymentProvider.
import {
  expectLiqpayPayPage,
  payLiqpayInvoiceWithTestCard,
  readLiqpayInvoiceAmountUah,
  returnFromLiqpayToStore,
} from "./liqpayTestPayment.mjs";
import {
  expectMonobankPayPage,
  payMonobankInvoiceWithTestCard,
  readMonobankInvoiceAmountUah,
  returnFromMonobankToStore,
} from "./monobankTestPayment.mjs";

// Кроки на сторінці банку, однакові за змістом для будь-якого провайдера.
const PAYMENT_PROVIDER_PAY_PAGE = Object.freeze({
  monobank: Object.freeze({
    expectPayPage: expectMonobankPayPage,
    readInvoiceAmountUah: readMonobankInvoiceAmountUah,
    payWithTestCard: payMonobankInvoiceWithTestCard,
    returnToStore: returnFromMonobankToStore,
  }),
  liqpay: Object.freeze({
    expectPayPage: expectLiqpayPayPage,
    readInvoiceAmountUah: readLiqpayInvoiceAmountUah,
    payWithTestCard: payLiqpayInvoiceWithTestCard,
    returnToStore: returnFromLiqpayToStore,
  }),
});

// «site» (07435, Power Pro): тестової сторінки банку немає — кроки «банку» виконує адаптер
// сайту (наприклад, перехоплює форму оплати й надсилає сайту відповідь банку, як це робить
// банк). Сайт вмикає це, коли в нього немає тестового мерчанта.
export const SITE_PAYMENT_PROVIDER_NAME = "site";
export const SITE_PAYMENT_ADAPTER_FUNCTION_NAMES = Object.freeze([
  "expectSitePaymentPage",
  "readSitePaymentAmountUah",
  "paySitePaymentAsBank",
  "returnFromSitePayment",
]);

export const SUPPORTED_PAYMENT_PROVIDER_NAMES = [...Object.keys(PAYMENT_PROVIDER_PAY_PAGE), SITE_PAYMENT_PROVIDER_NAME];

function readSitePaymentPayPage(siteAdapter) {
  const hasAllSteps = SITE_PAYMENT_ADAPTER_FUNCTION_NAMES.every((functionName) => typeof siteAdapter?.[functionName] === "function");
  if (!hasAllSteps) return null;
  return Object.freeze({
    expectPayPage: (page) => siteAdapter.expectSitePaymentPage(page),
    readInvoiceAmountUah: (page) => siteAdapter.readSitePaymentAmountUah(page),
    payWithTestCard: (page) => siteAdapter.paySitePaymentAsBank(page),
    returnToStore: (page) => siteAdapter.returnFromSitePayment(page),
  });
}

/** Кроки сторінки оплати провайдера або null, якщо бібліотека його не знає (для «site» — без кроків адаптера). */
export function findPaymentProviderPayPage(paymentProviderName, siteAdapter) {
  if (paymentProviderName === SITE_PAYMENT_PROVIDER_NAME) return readSitePaymentPayPage(siteAdapter);
  return PAYMENT_PROVIDER_PAY_PAGE[paymentProviderName] || null;
}
