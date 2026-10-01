// Вигаданий покупець-гість для оформлення замовлення на stage. Справжніх
// людей тут немає: прізвище «Тестовий/Тестова» одразу видно в замовленнях,
// а stage не передає замовлення в CRM, Telegram і рекламні кабінети
// (ORDER_DISPATCH_ENABLED=0, §4 контракту).

// Пари ім'я/по батькові/прізвище узгоджені за родом — форма, що перевіряє
// ПІБ, приймає їх так само, як від живого покупця.
export const FAKE_BUYER_IDENTITIES = [
  { firstName: "Андрій", middleName: "Петрович", lastName: "Тестовий" },
  { firstName: "Олена", middleName: "Петрівна", lastName: "Тестова" },
  { firstName: "Тарас", middleName: "Іванович", lastName: "Тестовий" },
  { firstName: "Марія", middleName: "Іванівна", lastName: "Тестова" },
];

// example.com зарезервований (RFC 2606): лист на нього нікому не дійде.
export const FAKE_BUYER_EMAIL_DOMAIN = "example.com";
export const FAKE_BUYER_EMAIL_PREFIX = "e2e";

// Номер у форматі українського мобільного: +380 + код оператора + 7 цифр.
// Незайнятого «тестового» діапазону в Україні немає, тож номер може
// належати комусь — саме тому stage нічого не шле (SMS, CRM), а на проді
// тести із записом не запускаються взагалі.
export const FAKE_BUYER_PHONE_COUNTRY_CODE = "380";
export const FAKE_BUYER_PHONE_OPERATOR_CODE = "99";
// Внутрішній формат номера (099...) — з цією цифрою замість +380.
export const FAKE_BUYER_PHONE_TRUNK_PREFIX = "0";
// Фіксований початок абонентського номера — замовлення тестів легко знайти
// в базі stage за префіксом.
export const FAKE_BUYER_PHONE_SUBSCRIBER_PREFIX = "000";
export const FAKE_BUYER_PHONE_RANDOM_DIGIT_COUNT = 4;

// Унікальний хвіст email: два замовлення з одного запуску не злипаються.
export const FAKE_BUYER_UNIQUE_SUFFIX_LENGTH = 8;

export const FAKE_BUYER_ORDER_COMMENT = "Тестове замовлення site-ci-kit, не обробляти";
