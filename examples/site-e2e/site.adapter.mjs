// Шаблон e2e/site.adapter.mjs (docs/site-contract.md §3): як на ЦЬОМУ сайті
// виконати крок сценарію. Скопіюйте в <репозиторій сайту>/e2e/ і реалізуйте
// кожну функцію селекторами свого сайту. Імпортувати можна лише
// "@playwright/test" і вбудовані модулі Node — їх дає бібліотека.
//
// Поки функцію не реалізовано, вона кидає зрозумілу помилку: тест, що її
// викликає, червоний у звіті з назвою функції. Видаляти функції не можна —
// бібліотека перевіряє, що експортовано всі.
//
// Порада щодо селекторів: getByRole / getByLabel / data-testid стійкіші за
// CSS-класи, які змінює верстка.
//
// expect знадобиться в expect*-функціях (у шаблоні ще не використовується).
// eslint-disable-next-line no-unused-vars
import { expect } from "@playwright/test";

function failNotImplemented(adapterFunctionName) {
  throw new Error(`site.adapter.mjs: ${adapterFunctionName} ещё не реализована для этого сайта`);
}

/** Відкрити siteConfig.testProduct.path, обрати optionLabel, додати в кошик і дочекатися підтвердження. */
export async function addTestProductToCart(page, siteConfig) {
  // TODO: await page.goto(siteConfig.testProduct.path);
  //       await page.getByRole("button", { name: siteConfig.testProduct.optionLabel }).click();
  //       await page.getByRole("button", { name: "Додати в кошик" }).click();
  //       await expect(<лічильник кошика>).toHaveText("1");
  // Для авторизованого покупця кошик зберігається на сервері: залишки
  // минулих запусків прибирає `npm run seed:reset` або цей крок.
  failNotImplemented("addTestProductToCart");
}

/** Відкрити форму оформлення з поточним кошиком. */
export async function openCheckout(page) {
  failNotImplemented("openCheckout");
}

/** Заповнити ПІБ, телефон, email гостя. buyer — вигадані дані з бібліотеки. */
export async function fillGuestBuyer(page, buyer) {
  // buyer: firstName, middleName, lastName, fullName, phoneInternational
  // (+380...), phoneNational (0...), email, orderComment.
  failNotImplemented("fillGuestBuyer");
}

/** Обрати місто і відділення НП (відповіді API НП уже підмінено з siteConfig.novaPoshta). */
export async function chooseNovaPoshtaBranch(page, novaPoshta) {
  // novaPoshta: cityName, warehouseName (+ areaName, якщо сайт питає область).
  failNotImplemented("chooseNovaPoshtaBranch");
}

/** Обрати оплату без переходу в банк (накладений платіж, IBAN, готівка). */
export async function chooseOfflinePayment(page) {
  failNotImplemented("chooseOfflinePayment");
}

/** Надіслати форму замовлення. */
export async function submitOrder(page) {
  failNotImplemented("submitOrder");
}

/** Перевірити сторінку «дякуємо» / підтвердження замовлення. */
export async function expectOrderPlaced(page) {
  // TODO: await expect(page).toHaveURL(/\/thank-you/);
  failNotImplemented("expectOrderPlaced");
}

/** Увійти як тестовий покупець: телефон + код з env (на stage SMS не шлеться). */
export async function loginCustomer(page, { phone, otpCode }) {
  failNotImplemented("loginCustomer");
}

/** Покупець увійшов: видно кабінет / ім'я. */
export async function expectCustomerLoggedIn(page) {
  failNotImplemented("expectCustomerLoggedIn");
}

/** Вийти з кабінету. */
export async function logoutCustomer(page) {
  failNotImplemented("logoutCustomer");
}

/** Покупець вийшов: знову видно кнопку входу. */
export async function expectCustomerLoggedOut(page) {
  failNotImplemented("expectCustomerLoggedOut");
}

/** У формі замовлення вже заповнені ім'я, телефон і доставка тестового покупця. */
export async function expectCheckoutAutofilled(page) {
  // TODO: await expect(page.getByLabel("Телефон")).not.toHaveValue("");
  failNotImplemented("expectCheckoutAutofilled");
}

/** Увійти в адмінку тестовим адміном із сиду stage. */
export async function loginAdmin(page, { login, password }) {
  failNotImplemented("loginAdmin");
}

/** Видно панель адмінки (а не форму входу). */
export async function expectAdminPanel(page) {
  failNotImplemented("expectAdminPanel");
}

/** Поставити фільтр на вже відкритій сторінці siteConfig.categoryFilter.categoryPath. */
export async function applyCategoryFilter(page, siteConfig) {
  failNotImplemented("applyCategoryFilter");
}

/** Скільки товарів зараз у видачі. Бібліотека опитує це, доки не стане > 0. */
export async function readListedProductCount(page) {
  // TODO: return page.locator(".product-card").count();
  failNotImplemented("readListedProductCount");
}
