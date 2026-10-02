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

/**
 * Відкрити siteConfig.testProduct.path, обрати optionLabel (null — перший
 * доступний варіант), додати в кошик і дочекатися підтвердження.
 * Повертає { unitPrice, sku }: ціну обраного варіанта з картки (число, грн) і
 * SKU варіанта, що потрапив у кошик (06641 — звірка з кошиком і базою).
 */
export async function addTestProductToCart(page, siteConfig) {
  // TODO: await page.goto(siteConfig.testProduct.path);
  //       await page.getByRole("button", { name: siteConfig.testProduct.optionLabel }).click();
  //       const unitPrice = Number((await page.getByTestId("product-price").innerText()).replace(/\D/g, ""));
  //       const sku = await page.getByTestId("selected-variant").getAttribute("data-sku");
  //       await page.getByRole("button", { name: "Додати в кошик" }).click();
  //       await expect(<лічильник кошика>).toHaveText("1");
  //       return { unitPrice, sku };
  // Для авторизованого покупця кошик зберігається на сервері: залишки
  // минулих запусків прибирає `npm run seed:reset` або цей крок.
  failNotImplemented("addTestProductToCart");
}

/** Сума товарів у кошику / на оформленні (без доставки), числом у гривнях. */
export async function readCartTotal(page) {
  failNotImplemented("readCartTotal");
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

/** Номер щойно оформленого замовлення (рядком) — з URL «дякуємо» чи атрибута підтвердження. */
export async function readPlacedOrderNumber(page) {
  failNotImplemented("readPlacedOrderNumber");
}

/** Відкрити історію замовлень у кабінеті й переконатися, що orderNumber там є. */
export async function expectOrderInCustomerAccount(page, orderNumber) {
  failNotImplemented("expectOrderInCustomerAccount");
}

/** Увійти як тестовий покупець: телефон + код з env (на stage SMS не шлеться). */
export async function loginCustomer(page, { phone, otpCode }) {
  failNotImplemented("loginCustomer");
}

/** Покупець увійшов: видно кабінет / ім'я. */
export async function expectCustomerLoggedIn(page) {
  failNotImplemented("expectCustomerLoggedIn");
}

/** Bearer-токен покупця (зазвичай кука), поки він увійшов: бібліотека перевіряє, що після виходу він не діє. */
export async function readCustomerSessionToken(page) {
  failNotImplemented("readCustomerSessionToken");
}

/** Вийти з кабінету. Сайт має відкликати токен на сервері, а не лише стерти куку. */
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

/** (Адмін уже увійшов) відкрити список замовлень і переконатися, що він завантажився без помилки. */
export async function expectAdminOrdersList(page) {
  failNotImplemented("expectAdminOrdersList");
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
