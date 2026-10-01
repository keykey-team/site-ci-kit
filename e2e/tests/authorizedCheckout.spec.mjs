// Замовлення авторизованого покупця з автозаповненням (06640): ім'я, телефон і
// доставку форма бере з профілю тестового покупця із сиду stage.
import { test } from "../lib/fixtures.mjs";

test("авторизованный покупатель оформляет заказ с автозаполнением @smoke", async ({
  page,
  siteConfig,
  siteAdapter,
  customerCredentials,
}) => {
  await test.step("войти по телефону и коду", async () => {
    await siteAdapter.loginCustomer(page, customerCredentials);
  });
  await test.step("положить тестовый товар в корзину", async () => {
    await siteAdapter.addTestProductToCart(page, siteConfig);
  });
  await test.step("открыть оформление заказа", async () => {
    await siteAdapter.openCheckout(page);
  });
  await test.step("форма заполнена данными покупателя", async () => {
    await siteAdapter.expectCheckoutAutofilled(page);
  });
  await test.step("выбрать оплату без перехода в банк", async () => {
    await siteAdapter.chooseOfflinePayment(page);
  });
  await test.step("отправить заказ", async () => {
    await siteAdapter.submitOrder(page);
  });
  await test.step("увидеть подтверждение заказа", async () => {
    await siteAdapter.expectOrderPlaced(page);
  });
});
