// Два варіанти одного товару в кошику (06649, критерій 38): кожен варіант —
// окрема позиція зі своїм розміром і фото, а сума кошика — сума двох цін.
// Ловить класичну поломку: другий варіант затирає перший або додається до
// його кількості, і покупець отримує не ту пару.
// Лише stage: сценарій спирається на товар сида (cartVariantsScenario сайту).
import { expect, test } from "../lib/fixtures.mjs";

const EXPECTED_CART_ROWS_COUNT = 2;
const SINGLE_UNIT_QUANTITY = 1;

test("два варианта одного товара — две позиции со своим размером, фото и верной суммой @regression", async ({
  page,
  siteAdapter,
  cartVariantsScenario,
}) => {
  const { productPath, productName, colourLabel, firstVariant, secondVariant } = cartVariantsScenario;
  expect(firstVariant.optionLabel, "варианты сценария должны различаться (данные сайта)").not.toBe(
    secondVariant.optionLabel,
  );

  const addedOffers = [];
  for (const expectedVariant of [firstVariant, secondVariant]) {
    await test.step(`положить в корзину вариант ${expectedVariant.optionLabel}`, async () => {
      const addedOffer = await siteAdapter.addProductVariantToCart(page, {
        productPath,
        optionLabel: expectedVariant.optionLabel,
      });
      expect(addedOffer.unitPrice, `цена варианта ${expectedVariant.optionLabel}`).toBe(expectedVariant.priceUah);
      addedOffers.push({ optionLabel: expectedVariant.optionLabel, ...addedOffer });
    });
  }
  expect(addedOffers[0].sku, "у двух вариантов один и тот же артикул").not.toBe(addedOffers[1].sku);

  const cartRows = await test.step("в корзине две позиции", async () => {
    await expect
      .poll(async () => (await siteAdapter.readCartRows(page)).length, { message: "в корзине не две позиции" })
      .toBe(EXPECTED_CART_ROWS_COUNT);
    return siteAdapter.readCartRows(page);
  });

  for (const addedOffer of addedOffers) {
    await test.step(`позиция ${addedOffer.optionLabel}: товар, размер, цвет и фото`, () => {
      const cartRow = cartRows.find((candidateRow) => candidateRow.optionLabel === addedOffer.optionLabel);
      expect(cartRow, `в корзине нет позиции с вариантом ${addedOffer.optionLabel}`).toBeTruthy();
      expect(cartRow.productName, "название товара в позиции").toContain(productName);
      if (colourLabel) expect(cartRow.rowText, "цвет в позиции корзины").toContain(colourLabel);
      expect(cartRow.photoUrl, "фото позиции ≠ фото товара").toBe(addedOffer.photoUrl);
      expect(cartRow.quantity, "количество в позиции").toBe(SINGLE_UNIT_QUANTITY);
    });
  }

  await test.step("сумма корзины = сумме двух цен", async () => {
    expect(await siteAdapter.readCartTotal(page)).toBe(firstVariant.priceUah + secondVariant.priceUah);
  });
});
