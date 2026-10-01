// Шлях гостя каталог → кошик → замовлення з доставкою Новою поштою (06640).
// Лише stage: тест створює замовлення. На проді його пропускає
// prodWriteProtection (немає @prod-safe), а smoke.yml туди й не відбирає.
import { test } from "../lib/fixtures.mjs";

test("гость оформляет заказ с доставкой Новой почтой @smoke", async ({ page, siteConfig, siteAdapter, buyer }) => {
  await test.step("положить тестовый товар в корзину", async () => {
    await siteAdapter.addTestProductToCart(page, siteConfig);
  });
  await test.step("открыть оформление заказа", async () => {
    await siteAdapter.openCheckout(page);
  });
  await test.step("заполнить данные покупателя", async () => {
    await siteAdapter.fillGuestBuyer(page, buyer);
  });
  await test.step(`выбрать отделение НП: ${siteConfig.novaPoshta.cityName}`, async () => {
    await siteAdapter.chooseNovaPoshtaBranch(page, siteConfig.novaPoshta);
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
