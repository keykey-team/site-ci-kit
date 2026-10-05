// Шлях каталог → замовлення на телефоні (06649, критерій 43). Іде лише в
// проєкті mobile-webkit: екран iPhone і рушій WebKit, як у Safari на iPhone.
//
// Що ловить: верстку, яка роз'їжджається на вузькому екрані (сторінку можна
// зсунути вбік), і кнопки, на які не натиснути — їх перекрив інший елемент або
// вони поза екраном. Натискання в тесті справжні: Playwright не клацне по
// кнопці, яку покупець не бачить або не може зачепити.
// Лише stage: тест створює звичайне замовлення гостя.
import { HTTP_ERROR_STATUS_MIN } from "../config/pageChecks.config.mjs";
import { OPTIONAL_SCENARIO_CONTRACT } from "../config/siteContract.config.mjs";
import { expect, test } from "../lib/fixtures.mjs";
import { expectNoHorizontalOverflow } from "../lib/layoutChecks.mjs";
import { describeOptionalScenarioGap } from "../lib/optionalScenario.mjs";
import { loadSiteAdapter } from "../lib/siteAdapter.mjs";
import { loadSiteConfig } from "../lib/siteConfig.mjs";

// Сайт, який сценарій не підключив, пропускає тест ще до запуску браузера: у
// нього в CI немає WebKit (smoke.yml ставить лише chromium), і пропуск через
// фікстуру спрацював би запізно — тест упав би на запуску браузера.
const mobileScenarioGap = describeOptionalScenarioGap(
  await loadSiteConfig(),
  await loadSiteAdapter(),
  OPTIONAL_SCENARIO_CONTRACT.mobileCheckout,
);
test.skip(Boolean(mobileScenarioGap), `${mobileScenarioGap} — тест пропущен`);

test("гость проходит путь каталог → заказ на iPhone, вёрстка не шире экрана @regression @mobile", async ({
  page,
  siteConfig,
  siteAdapter,
  buyer,
  mobileCheckoutScenario,
}) => {
  const { categoryPath, productName, optionLabel } = mobileCheckoutScenario;

  await test.step(`открыть каталог ${categoryPath}`, async () => {
    // Код ответа проверяем явно: страница отказа («401», «502») тоже не шире
    // экрана, и без этой проверки шаг прошёл бы на ней.
    const categoryResponse = await page.goto(categoryPath);
    expect(categoryResponse.status(), `каталог ответил ${categoryResponse.status()}`).toBeLessThan(HTTP_ERROR_STATUS_MIN);
    await expectNoHorizontalOverflow(page, "каталог");
  });
  await test.step(`открыть товар «${productName}» из выдачи`, async () => {
    await siteAdapter.openListedProductByName(page, productName);
    await expectNoHorizontalOverflow(page, "страница товара");
  });
  await test.step(`выбрать вариант ${optionLabel} и положить в корзину`, async () => {
    await siteAdapter.addOpenedProductToCart(page, { optionLabel });
    await expectNoHorizontalOverflow(page, "корзина");
  });
  await test.step("открыть оформление заказа", async () => {
    await siteAdapter.openCheckout(page);
    await expectNoHorizontalOverflow(page, "оформление заказа");
  });
  await test.step("заполнить данные покупателя", async () => {
    await siteAdapter.fillGuestBuyer(page, buyer);
  });
  await test.step(`выбрать отделение НП: ${siteConfig.novaPoshta.cityName}`, async () => {
    await siteAdapter.chooseNovaPoshtaBranch(page, siteConfig.novaPoshta);
  });
  await test.step("выбрать оплату без перехода в банк", async () => {
    await siteAdapter.chooseOfflinePayment(page);
    await expectNoHorizontalOverflow(page, "заполненная форма заказа");
  });
  await test.step("отправить заказ", async () => {
    await siteAdapter.submitOrder(page);
  });
  await test.step("увидеть подтверждение заказа", async () => {
    await siteAdapter.expectOrderPlaced(page);
    await expectNoHorizontalOverflow(page, "страница «спасибо»");
    test.info().annotations.push({ type: "order", description: await siteAdapter.readPlacedOrderNumber(page) });
  });
});
