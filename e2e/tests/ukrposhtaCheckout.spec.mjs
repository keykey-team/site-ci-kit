// Замовлення гостя з доставкою Укрпоштою (06967): той самий шлях, що й з Новою
// поштою (guestCheckout.spec.mjs), але відділення Укрпошти. Сайт без Укрпошти
// (немає ukrposhtaCheckoutScenario) тест пропускає з поясненням.
// Лише stage: створює звичайне замовлення, на проді його не пускає
// prodWriteProtection (немає @prod-safe).
import { expect, test } from "../lib/fixtures.mjs";
import { expectCartTotalMatchesProductPrice, expectStoredOrderMatchesCart } from "../lib/orderChecks.mjs";
import { readStoredOrder } from "../lib/siteApi.mjs";

test("гость оформляет заказ с доставкой Укрпоштой @smoke", async ({
  page,
  request,
  siteConfig,
  siteAdapter,
  buyer,
  testOrderToken,
  ukrposhtaCheckoutScenario,
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
  await test.step(`выбрать отделение Укрпошты: ${ukrposhtaCheckoutScenario.cityName}`, async () => {
    await siteAdapter.chooseUkrposhtaBranch(page, ukrposhtaCheckoutScenario);
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
  await test.step("заказ в базе с той же суммой, товаром и доставкой Укрпоштой", async () => {
    const orderNumber = await siteAdapter.readPlacedOrderNumber(page);
    test.info().annotations.push({ type: "order", description: orderNumber });
    const storedOrder = await readStoredOrder(request, siteConfig, { orderNumber, testOrderToken });
    expect(storedOrder.isTest, "обычный заказ помечен как тестовый").toBe(false);
    expectStoredOrderMatchesCart(storedOrder, { sku, unitPrice, cartTotal });
    if (ukrposhtaCheckoutScenario.storedDeliveryMethod) {
      expect(storedOrder.deliveryMethod, "способ доставки в заказе").toBe(ukrposhtaCheckoutScenario.storedDeliveryMethod);
    }
  });
});
