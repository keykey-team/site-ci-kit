// Тестові замовлення з іншими способами доставки (07427, Power Pro): той самий
// шлях, що й testOrder.spec.mjs, але замість відділення Нової пошти — кожен
// спосіб із deliveryOptionsCheckoutScenario.deliveryOptions (поштомат, кур'єр…).
// Окремий тест на кожен спосіб — у звіті видно, який саме зламався.
// Замовлення з заголовком-секретом: склад stage не рухається, менеджерам воно
// не йде. Лише stage (немає @prod-safe): на проді тестове замовлення одне.
import { expect, test } from "../lib/fixtures.mjs";
import { stubNovaPoshtaApi } from "../lib/novaPoshtaStub.mjs";
import { expectCartTotalMatchesProductPrice, expectStoredOrderMatchesCart } from "../lib/orderChecks.mjs";
import { readStoredOrder } from "../lib/siteApi.mjs";
import { loadSiteConfig } from "../lib/siteConfig.mjs";
import { attachTestOrderToken, blockAnalyticsRequests } from "../lib/testOrderRequests.mjs";

const loadedSiteConfig = await loadSiteConfig();
// Назви тестів потрібні до запуску. Сайт без сценарію отримує один тест, який
// фікстура deliveryOptionsCheckoutScenario пропустить з поясненням.
const declaredDeliveryOptionTitles = (loadedSiteConfig.deliveryOptionsCheckoutScenario?.deliveryOptions ?? []).map(
  (deliveryOption) => deliveryOption.title,
);
const deliveryOptionTitles = declaredDeliveryOptionTitles.length ? declaredDeliveryOptionTitles : ["другой способ"];

deliveryOptionTitles.forEach((deliveryOptionTitle, deliveryOptionIndex) => {
  test(`тестовый заказ с доставкой: ${deliveryOptionTitle} @smoke`, async ({
    page,
    request,
    siteConfig,
    siteAdapter,
    testOrderBuyer,
    testOrderToken,
    deliveryOptionsCheckoutScenario,
  }) => {
    const deliveryOption = deliveryOptionsCheckoutScenario.deliveryOptions[deliveryOptionIndex];

    // Свій довідник НП для способу (поштомат — інший тип відділення): пізніше
    // зареєстрована підміна в Playwright має пріоритет над підміною фікстури page.
    if (deliveryOption.novaPoshta) {
      await stubNovaPoshtaApi(page, { ...siteConfig.novaPoshta, ...deliveryOption.novaPoshta });
    }
    await blockAnalyticsRequests(page, siteConfig.testOrder.blockedRequestPatterns);
    await attachTestOrderToken(page, { createOrderUrlPattern: siteConfig.testOrder.createOrderUrlPattern, testOrderToken });

    const { unitPrice, sku } = await test.step("положить тестовый товар в корзину", () =>
      siteAdapter.addTestProductToCart(page, siteConfig),
    );
    await test.step("открыть оформление заказа", () => siteAdapter.openCheckout(page));
    const cartTotal = await test.step("сумма в корзине = цена товара", async () => {
      const shownCartTotal = await siteAdapter.readCartTotal(page);
      expectCartTotalMatchesProductPrice({ cartTotal: shownCartTotal, unitPrice });
      return shownCartTotal;
    });
    await test.step("заполнить данные покупателя", () => siteAdapter.fillGuestBuyer(page, testOrderBuyer));
    await test.step(`выбрать доставку: ${deliveryOption.title}`, () =>
      siteAdapter.chooseDeliveryOption(page, deliveryOption),
    );
    await test.step("оформить заказ без перехода в банк", async () => {
      await siteAdapter.chooseOfflinePayment(page);
      await siteAdapter.submitOrder(page);
      await siteAdapter.expectOrderPlaced(page);
    });
    const orderNumber = await siteAdapter.readPlacedOrderNumber(page);
    test.info().annotations.push({ type: "test-order", description: orderNumber });

    await test.step("заказ в базе: тестовый, сумма и товар как в корзине, выбранная доставка", async () => {
      const storedOrder = await readStoredOrder(request, siteConfig, { orderNumber, testOrderToken });
      expect(storedOrder.isTest, "заказ не помечен тестовым — сайт принял его как настоящий").toBe(true);
      expectStoredOrderMatchesCart(storedOrder, { sku, unitPrice, cartTotal });
      if (deliveryOption.storedDeliveryMethod) {
        expect(storedOrder.deliveryMethod, "способ доставки в заказе").toBe(deliveryOption.storedDeliveryMethod);
      }
    });
  });
});
