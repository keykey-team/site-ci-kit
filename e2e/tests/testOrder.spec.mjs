// Тестове замовлення (06641, пункт 10 задачі): каталог → кошик → замовлення
// гостя з заголовком-секретом. Сервер сайту позначає його isTest: склад,
// бонуси, метрики й аналітика не рухаються, у CRM воно йде з позначкою «тест»
// і одразу скасовується. Єдиний тест, що пише на проді (тег @test-order).
// На stage — той самий шлях на товарі із сиду; CRM там вимкнено
// (ORDER_DISPATCH_ENABLED=0), тож стан у CRM перевіряється лише на проді.
import { TEST_ORDER_CRM_SETTLE_TIMEOUT_MS } from "../config/testOrder.config.mjs";
import { expect, test } from "../lib/fixtures.mjs";
import { expectCartTotalMatchesProductPrice, expectStoredOrderMatchesCart } from "../lib/orderChecks.mjs";
import { readStockQuantity, readStoredOrder } from "../lib/siteApi.mjs";
import { isProdEnvironment } from "../lib/targetEnvironment.mjs";
import { attachTestOrderToken, blockAnalyticsRequests } from "../lib/testOrderRequests.mjs";

test("тестовый заказ не трогает склад и статистику и отменяется @smoke @test-order", async ({
  page,
  request,
  siteConfig,
  siteAdapter,
  targetEnvironment,
  testOrderBuyer,
  testOrderToken,
}) => {
  const isProd = isProdEnvironment(targetEnvironment);
  // На проді — справжній товар із testOrder.product, на stage — товар сиду із
  // залишком, який seed:reset повертає перед кожним smoke.
  const testOrderProduct = isProd ? siteConfig.testOrder.product : siteConfig.testProduct;
  const apiReadOptions = { testOrderToken };

  await blockAnalyticsRequests(page, siteConfig.testOrder.blockedRequestPatterns);
  await attachTestOrderToken(page, { createOrderUrlPattern: siteConfig.testOrder.createOrderUrlPattern, testOrderToken });

  const { unitPrice, sku } = await test.step(`положить в корзину ${testOrderProduct.path}`, () =>
    siteAdapter.addTestProductToCart(page, { ...siteConfig, testProduct: testOrderProduct }),
  );
  const stockQuantityBeforeOrder = await test.step(`остаток ${sku} до заказа`, () =>
    readStockQuantity(request, siteConfig, { sku, ...apiReadOptions }),
  );
  await test.step("открыть оформление заказа", () => siteAdapter.openCheckout(page));
  const cartTotal = await test.step("сумма в корзине = цена товара", async () => {
    const shownCartTotal = await siteAdapter.readCartTotal(page);
    expectCartTotalMatchesProductPrice({ cartTotal: shownCartTotal, unitPrice });
    return shownCartTotal;
  });
  await test.step("оформить заказ без перехода в банк", async () => {
    await siteAdapter.fillGuestBuyer(page, testOrderBuyer);
    await siteAdapter.chooseNovaPoshtaBranch(page, siteConfig.novaPoshta);
    await siteAdapter.chooseOfflinePayment(page);
    await siteAdapter.submitOrder(page);
    await siteAdapter.expectOrderPlaced(page);
  });
  const orderNumber = await siteAdapter.readPlacedOrderNumber(page);
  test.info().annotations.push({ type: "test-order", description: orderNumber });

  await test.step("заказ в базе помечен тестовым, сумма и товар как в корзине", async () => {
    const storedOrder = await readStoredOrder(request, siteConfig, { orderNumber, ...apiReadOptions });
    expect(storedOrder.isTest, "заказ не помечен тестовым — сайт принял его как настоящий").toBe(true);
    expectStoredOrderMatchesCart(storedOrder, { sku, unitPrice, cartTotal });
  });
  await test.step(`остаток ${sku} не изменился`, async () => {
    const stockQuantityAfterOrder = await readStockQuantity(request, siteConfig, { sku, ...apiReadOptions });
    expect(stockQuantityAfterOrder, "тестовый заказ списал или зарезервировал товар").toBe(stockQuantityBeforeOrder);
  });
  await test.step("заказ отменён на сайте" + (isProd ? " и в CRM" : ""), async () => {
    await expect
      .poll(
        async () => {
          const { isCancelled, crm } = await readStoredOrder(request, siteConfig, { orderNumber, ...apiReadOptions });
          return { isCancelled, ...(isProd ? { isSentToCrm: Boolean(crm?.orderId), isCancelledInCrm: crm?.isCancelled } : {}) };
        },
        { message: "тестовый заказ не отменён", timeout: TEST_ORDER_CRM_SETTLE_TIMEOUT_MS },
      )
      .toEqual({ isCancelled: true, ...(isProd ? { isSentToCrm: true, isCancelledInCrm: true } : {}) });
  });
});
