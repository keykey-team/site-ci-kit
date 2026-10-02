// Шлях гостя каталог → кошик → замовлення з доставкою Новою поштою (06640).
// З 06641 — ще й сума в кошику і замовлення в базі (через API сайту).
// Лише stage: тест створює звичайне замовлення. На проді його пропускає
// prodWriteProtection (немає @prod-safe), а smoke.yml туди й не відбирає.
import { expect, test } from "../lib/fixtures.mjs";
import { expectCartTotalMatchesProductPrice, expectStoredOrderMatchesCart } from "../lib/orderChecks.mjs";
import { readStoredOrder } from "../lib/siteApi.mjs";

test("гость оформляет заказ с доставкой Новой почтой @smoke", async ({
  page,
  request,
  siteConfig,
  siteAdapter,
  buyer,
  testOrderToken,
}) => {
  const { unitPrice, sku } = await test.step("положить тестовый товар в корзину", () =>
    siteAdapter.addTestProductToCart(page, siteConfig),
  );
  await test.step("открыть оформление заказа", async () => {
    await siteAdapter.openCheckout(page);
  });
  const cartTotal = await test.step("сумма в корзине = цена товара", async () => {
    const shownCartTotal = await siteAdapter.readCartTotal(page);
    expectCartTotalMatchesProductPrice({ cartTotal: shownCartTotal, unitPrice });
    return shownCartTotal;
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
  await test.step("заказ в базе с той же суммой и товаром", async () => {
    const orderNumber = await siteAdapter.readPlacedOrderNumber(page);
    test.info().annotations.push({ type: "order", description: orderNumber });
    const storedOrder = await readStoredOrder(request, siteConfig, { orderNumber, testOrderToken });
    expect(storedOrder.isTest, "обычный заказ помечен как тестовый").toBe(false);
    expectStoredOrderMatchesCart(storedOrder, { sku, unitPrice, cartTotal });
  });
});
