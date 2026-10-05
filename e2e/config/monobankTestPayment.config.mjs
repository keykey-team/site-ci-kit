// Тестова сторінка оплати monobank (06649). Тільки значення.
//
// Сайт на stage працює з ТЕСТОВИМ токеном еквайрингу monobank: рахунки
// справжні за формою, але гроші не рухаються, а картку приймає будь-яку з
// коректним номером. Селектори — сторінки банку, тому вони тут, а не в
// адаптері сайту: вони однакові для всіх сайтів з monobank. Зміниться сторінка
// банку — правиться лише цей файл.

export const MONOBANK_PAY_PAGE_URL_PATTERN = /^https:\/\/pay\.monobank\.ua\//;

// Загальновідомий тестовий номер Visa (проходить перевірку Луна). Справжньої
// картки з таким номером не існує; у тестовому середовищі банк її приймає.
export const MONOBANK_TEST_CARD_NUMBER = "4242424242424242";
export const MONOBANK_TEST_CARD_CVC = "123";
// Строк дії рахується від сьогодні, щоб тест не зламався, коли мине зашита дата.
export const MONOBANK_TEST_CARD_EXPIRY_MONTH = 12;
export const MONOBANK_TEST_CARD_VALID_YEARS = 3;

export const MONOBANK_PAY_PAGE_SELECTOR = Object.freeze({
  cardNumberInput: "#cardNumber",
  cardExpiryInput: "#expiresAt",
  cardCvcInput: "#cvc",
  // На кнопці — сума рахунку: «Оплатити 950 ₴».
  payWithCardButton: "#payWithCardButton",
  returnToStoreButton: "#back_to_store_btn",
});

// Тестове середовище замість 3-D Secure показує сторінку-імітацію з кнопкою
// підтвердження (і кнопками відмов — для сценаріїв невдалої оплати).
export const MONOBANK_FAKE_3DS_CONFIRM_BUTTON_NAME = "Підтвердити";

// Напис на сторінці банку після успішної оплати («Сплачено 950 ₴»).
export const MONOBANK_PAID_TEXT = "Сплачено";

// Перехід на сторінку банку й назад: рахунок створює сервер сайту запитом до
// банку, тож це довше за звичайну навігацію.
export const MONOBANK_PAGE_TIMEOUT_MS = 45_000;
