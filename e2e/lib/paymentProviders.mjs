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

export const SUPPORTED_PAYMENT_PROVIDER_NAMES = Object.keys(PAYMENT_PROVIDER_PAY_PAGE);

/** Кроки сторінки оплати провайдера або null, якщо бібліотека його не знає. */
export function findPaymentProviderPayPage(paymentProviderName) {
  return PAYMENT_PROVIDER_PAY_PAGE[paymentProviderName] || null;
}
