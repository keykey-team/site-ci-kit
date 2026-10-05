// Правки з адмінки на вітрині (06649, критерій 42): нова ціна й новий залишок
// видні покупцеві не пізніше ніж за хвилину, а товар із залишком 0 купити не
// можна. Ловить застарілий кеш: адмін змінив ціну, а сайт годину продає за старою.
//
// Лише stage. Товар — окремий у сиді (adminCatalogEditScenario сайту): smoke
// звіряє ціну основного тестового товару, тож міняти її тут не можна. У кінці
// тест повертає товар до стану сида.
import { expect, test } from "../lib/fixtures.mjs";
import {
  ADMIN_EDIT_POLL_INTERVALS_MS,
  ADMIN_EDIT_PROPAGATION_TIMEOUT_MS,
  ADMIN_EDIT_TEST_TIMEOUT_MS,
  SOLD_OUT_STOCK_QUANTITY,
} from "../config/regressionScenarios.config.mjs";
import { readStockQuantity } from "../lib/siteApi.mjs";

const MILLISECONDS_IN_SECOND = 1_000;
const PROPAGATION_LIMIT_SECONDS = ADMIN_EDIT_PROPAGATION_TIMEOUT_MS / MILLISECONDS_IN_SECOND;

test(`правка цены и остатка в админке видна на сайте за ${PROPAGATION_LIMIT_SECONDS} с; при остатке 0 товар не купить @regression`, async ({
  page: adminPage,
  anonymousBuyerPage,
  request,
  siteConfig,
  siteAdapter,
  adminCatalogEditScenario,
  adminCredentials,
  testOrderToken,
}) => {
  test.setTimeout(ADMIN_EDIT_TEST_TIMEOUT_MS);
  const { productPath, adminProductKey, optionLabel, sku, seededOffer, editedOffer } = adminCatalogEditScenario;
  expect(editedOffer.priceUah, "новая цена должна отличаться от цены сида (данные сайта)").not.toBe(seededOffer.priceUah);
  expect(editedOffer.stockQuantity, "новый остаток должен быть больше 0 (данные сайта)").toBeGreaterThan(
    SOLD_OUT_STOCK_QUANTITY,
  );

  const readStorefrontOffer = () => siteAdapter.readStorefrontOffer(anonymousBuyerPage, { productPath, optionLabel });
  const readStorefrontStockQuantity = () => readStockQuantity(request, siteConfig, { sku, testOrderToken });

  // Правка в панелі, потім вітрина й залишок — доки не стануть очікуваними,
  // але не довше хвилини. Скільки це зайняло — в анотації звіту.
  async function saveOfferAndExpectOnStorefront({ priceUah, stockQuantity, isPurchasable }) {
    await siteAdapter.editProductOfferInAdmin(adminPage, { adminProductKey, optionLabel, priceUah, stockQuantity });
    const savedAtMs = Date.now();

    await expect
      .poll(readStorefrontOffer, {
        message: `правка не дошла до сайта за ${PROPAGATION_LIMIT_SECONDS} с`,
        timeout: ADMIN_EDIT_PROPAGATION_TIMEOUT_MS,
        intervals: ADMIN_EDIT_POLL_INTERVALS_MS,
      })
      // Товар, який купить нельзя, цену покупателю не предлагает — сверяем её только у доступного.
      .toMatchObject(isPurchasable ? { isPurchasable, priceUah } : { isPurchasable });
    await expect
      .poll(readStorefrontStockQuantity, {
        message: `остаток не обновился за ${PROPAGATION_LIMIT_SECONDS} с`,
        timeout: ADMIN_EDIT_PROPAGATION_TIMEOUT_MS,
        intervals: ADMIN_EDIT_POLL_INTERVALS_MS,
      })
      .toBe(stockQuantity);

    const propagationSeconds = Math.round((Date.now() - savedAtMs) / MILLISECONDS_IN_SECOND);
    test.info().annotations.push({
      type: "propagation",
      description: `цена ${priceUah}, остаток ${stockQuantity}: на сайте через ${propagationSeconds} с`,
    });
  }

  const seededStorefrontState = { ...seededOffer, isPurchasable: true };

  await test.step("войти в админку", async () => {
    await siteAdapter.loginAdmin(adminPage, adminCredentials);
  });

  await test.step("товар в исходном состоянии сида", async () => {
    const currentOffer = await readStorefrontOffer();
    const isSeededState = currentOffer.isPurchasable && currentOffer.priceUah === seededOffer.priceUah;
    // Прошлый прогон упал посреди сценария — возвращаем товар, иначе «новая
    // цена уже на сайте» прошла бы без единой правки.
    if (!isSeededState) await saveOfferAndExpectOnStorefront(seededStorefrontState);
  });

  await test.step(`новая цена ${editedOffer.priceUah} и остаток ${editedOffer.stockQuantity} видны на сайте`, async () => {
    await saveOfferAndExpectOnStorefront({ ...editedOffer, isPurchasable: true });
  });

  await test.step("остаток 0 — купить товар нельзя", async () => {
    await saveOfferAndExpectOnStorefront({
      priceUah: editedOffer.priceUah,
      stockQuantity: SOLD_OUT_STOCK_QUANTITY,
      isPurchasable: false,
    });
  });

  await test.step("вернуть цену и остаток сида", async () => {
    await saveOfferAndExpectOnStorefront(seededStorefrontState);
  });
});
