// Онлайн-оплата карткою зі знижкою (06649, критерій 41): покупець зі знижкою
// (промокод або бонуси — що є на сайті) платить тестовою карткою на сторінці
// банку, замовлення стає оплаченим, а сума всюди одна — на оформленні, у
// рахунку банку, на сторінці подяки й у базі.
//
// Лише stage, і лише коли сайт на stage працює з ТЕСТОВИМ токеном банку: гроші
// не рухаються. Передачу оплати в CRM тест не перевіряє — stage замовлень у CRM
// не шле (§4 контракту); це закривають інтеграційні тести сайту.
import { expect, test } from "../lib/fixtures.mjs";
import {
  ONLINE_PAYMENT_TEST_TIMEOUT_MS,
  PAYMENT_CONFIRMATION_POLL_INTERVALS_MS,
  PAYMENT_CONFIRMATION_TIMEOUT_MS,
} from "../config/regressionScenarios.config.mjs";
import { findPaymentProviderPayPage, SUPPORTED_PAYMENT_PROVIDER_NAMES } from "../lib/paymentProviders.mjs";
import { readStoredOrder } from "../lib/siteApi.mjs";

test("оплата тестовой картой со скидкой: заказ оплачен, сумма везде одна @regression", async ({
  page,
  request,
  siteConfig,
  siteAdapter,
  onlinePaymentScenario,
  customerCredentials,
  testOrderToken,
}) => {
  test.setTimeout(ONLINE_PAYMENT_TEST_TIMEOUT_MS);
  const { paymentProvider, expectedDiscountUah } = onlinePaymentScenario;
  const payPage = findPaymentProviderPayPage(paymentProvider);
  test.skip(
    !payPage,
    `onlinePaymentScenario.paymentProvider = «${paymentProvider}»: библиотека умеет ${SUPPORTED_PAYMENT_PROVIDER_NAMES.join(", ")}`,
  );

  await test.step("войти по телефону и коду", async () => {
    await siteAdapter.loginCustomer(page, customerCredentials);
  });
  const { unitPrice, sku } = await test.step("положить тестовый товар в корзину", () =>
    siteAdapter.addTestProductToCart(page, siteConfig),
  );
  await test.step("открыть оформление заказа", async () => {
    await siteAdapter.openCheckout(page);
    await siteAdapter.expectCheckoutAutofilled(page);
  });

  const discountUah = await test.step("скидка применена", async () => {
    const appliedDiscountUah = await siteAdapter.applyCheckoutDiscount(page, onlinePaymentScenario);
    expect(appliedDiscountUah, "скидки на оформлении нет").toBeGreaterThan(0);
    // Размер скидки сайт задаёт, только когда он не зависит от настроек магазина.
    if (expectedDiscountUah !== undefined) {
      expect(appliedDiscountUah, "размер скидки на оформлении").toBe(expectedDiscountUah);
    }
    return appliedDiscountUah;
  });
  const totalToPayUah = await test.step("к оплате = цена товара − скидка", async () => {
    const shownTotalToPayUah = await siteAdapter.readCheckoutTotalToPay(page);
    expect(shownTotalToPayUah, "сумма к оплате на оформлении").toBe(unitPrice - discountUah);
    return shownTotalToPayUah;
  });

  await test.step("выбрать оплату картой и отправить заказ", async () => {
    await siteAdapter.chooseOnlineCardPayment(page);
    await siteAdapter.submitOrderForOnlinePayment(page);
  });

  await test.step(`счёт банка — на ${totalToPayUah} грн`, async () => {
    await payPage.expectPayPage(page);
    expect(await payPage.readInvoiceAmountUah(page), "сумма счёта в банке ≠ сумме к оплате").toBe(totalToPayUah);
  });
  await test.step("оплатить тестовой картой", async () => {
    await payPage.payWithTestCard(page);
  });
  await test.step("вернуться на сайт", async () => {
    await payPage.returnToStore(page);
    await siteAdapter.expectOrderPlaced(page);
  });

  const orderNumber = await siteAdapter.readPlacedOrderNumber(page);
  test.info().annotations.push({ type: "order", description: orderNumber });

  await test.step("сумма на странице «спасибо» = сумме к оплате", async () => {
    expect(await siteAdapter.readThankYouOrderTotal(page), "сумма на странице «спасибо»").toBe(totalToPayUah);
  });

  await test.step("заказ в базе оплачен, сумма и скидка те же", async () => {
    const readOrder = () => readStoredOrder(request, siteConfig, { orderNumber, testOrderToken });
    // Банк сообщает сайту об оплате отдельным запросом — ждём, пока он дойдёт.
    await expect
      .poll(async () => (await readOrder()).payment?.isPaid, {
        message: "заказ не стал оплаченным: сайт не получил или не принял подтверждение банка",
        timeout: PAYMENT_CONFIRMATION_TIMEOUT_MS,
        intervals: PAYMENT_CONFIRMATION_POLL_INTERVALS_MS,
      })
      .toBe(true);

    const storedOrder = await readOrder();
    expect(storedOrder.payment.totalToPayAmount, "сумма к оплате в базе").toBe(totalToPayUah);
    expect(storedOrder.payment.discountAmount, "скидка в базе").toBe(discountUah);
    expect(storedOrder.items.map((storedItem) => storedItem.sku), "товар в заказе").toEqual([sku]);
  });
});
