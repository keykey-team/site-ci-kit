// Тестова сторінка оплати LiqPay (06976). Тільки значення.
//
// Сайт на stage передає LiqPay параметр sandbox: сторінка оплати та сама, що й
// бойова, але платіж проходить без списання грошей, а вебхук приходить зі
// статусом «sandbox». Селектори — сторінки LiqPay, тому вони тут, а не в
// адаптері сайту: однакові для всіх сайтів з LiqPay. Зміниться сторінка —
// правиться лише цей файл.

export const LIQPAY_PAY_PAGE_URL_PATTERN = /^https:\/\/www\.liqpay\.ua\//;
// Після оплати LiqPay показує свою сторінку «Дякуємо!» з кнопкою повернення.
export const LIQPAY_SUCCESS_PAGE_URL_PATTERN = /^https:\/\/www\.liqpay\.ua\/[a-z]{2}\/checkout\/success\//;

// Загальновідомий тестовий номер Visa (проходить перевірку Луна). У режимі
// sandbox LiqPay приймає будь-яку картку з коректним номером.
export const LIQPAY_TEST_CARD_NUMBER = "4242424242424242";
export const LIQPAY_TEST_CARD_CVV = "123";
// Строк дії рахується від сьогодні, щоб тест не зламався, коли мине зашита дата.
export const LIQPAY_TEST_CARD_EXPIRY_MONTH = 12;
export const LIQPAY_TEST_CARD_VALID_YEARS = 3;
// Ім'я власника LiqPay просить не завжди (залежно від картки) — вигадане.
export const LIQPAY_TEST_CARD_HOLDER = Object.freeze({ firstName: "Test", lastName: "Tester" });

export const LIQPAY_PAY_PAGE_SELECTOR = Object.freeze({
  cardNumberInput: "#cardNumber",
  cardExpiryInput: "#expiration",
  cardCvvInput: "#cvv",
  cardHolderFirstNameInput: "#firstName",
  cardHolderLastNameInput: "#lastName",
});
// На кнопці — сума платежу: «Оплатити 950.00 UAH». За текстом шукати не можна:
// «Оплатити» є ще на кнопках Google Pay і Apple Pay.
export const LIQPAY_PAY_BUTTON_TEST_ID = "card_pay_btn";
export const LIQPAY_RETURN_TO_STORE_BUTTON_NAME = "Повернутися на сайт";

// Поле імені власника з'являється не одразу після номера картки.
export const LIQPAY_CARD_HOLDER_FIELD_WAIT_MS = 3_000;

// Перехід на сторінку LiqPay й назад: посилання на оплату створює сервер сайту,
// а сторінка LiqPay важка (QR, Google Pay, Apple Pay) — довше за звичайну навігацію.
export const LIQPAY_PAGE_TIMEOUT_MS = 45_000;
