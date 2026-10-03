// Розмір товару (06646): із каталогу, відфільтрованого за розміром, товар
// відкривається одразу на цьому розмірі; вибір іншого розміру міняє ціну й
// артикул; розпроданий розмір купити не можна.
// Лише stage: сценарій спирається на товари сида (catalogScenario сайту).
import { expect, test } from "../lib/fixtures.mjs";

test("товар из отфильтрованного каталога открыт на выбранном размере @regression", async ({
  page,
  siteAdapter,
  catalogScenario,
}) => {
  const { categoryPath, filteredSizeLabel, filteredSizeUrlFragment } = catalogScenario;

  await test.step(`открыть категорию и выбрать размер ${filteredSizeLabel}`, async () => {
    await page.goto(categoryPath);
    await siteAdapter.applyCatalogSizeFilter(page, filteredSizeLabel);
    await expect
      .poll(() => decodeURIComponent(page.url()), { message: "размер не попал в URL" })
      .toContain(filteredSizeUrlFragment);
  });
  await test.step("открыть первый товар выдачи", async () => {
    await siteAdapter.openFirstListedProduct(page);
  });
  await test.step(`на странице товара выбран размер ${filteredSizeLabel}`, async () => {
    await expect
      .poll(() => siteAdapter.readSelectedSizeLabel(page), { message: "выбран не отфильтрованный размер" })
      .toBe(filteredSizeLabel);
  });
});

test("выбор размера меняет цену и артикул, распроданный размер недоступен @regression", async ({
  page,
  siteAdapter,
  catalogScenario,
}) => {
  const { path, firstSize, secondSize, soldOutSizeLabel } = catalogScenario.variantProduct;
  expect(firstSize.priceUah, "у двух размеров должны быть разные цены (данные сида)").not.toBe(secondSize.priceUah);

  await test.step(`открыть ${path}`, async () => {
    await page.goto(path);
  });

  const firstOffer = await test.step(`размер ${firstSize.label}: цена ${firstSize.priceUah}`, async () => {
    await siteAdapter.chooseProductSize(page, firstSize.label);
    const selectedOffer = await siteAdapter.readSelectedVariantOffer(page);
    expect(selectedOffer.priceUah).toBe(firstSize.priceUah);
    return selectedOffer;
  });

  await test.step(`размер ${secondSize.label}: цена ${secondSize.priceUah}, другой артикул`, async () => {
    await siteAdapter.chooseProductSize(page, secondSize.label);
    const selectedOffer = await siteAdapter.readSelectedVariantOffer(page);
    expect(selectedOffer.priceUah).toBe(secondSize.priceUah);
    expect(selectedOffer.sku, "артикул не изменился вместе с размером").not.toBe(firstOffer.sku);
  });

  await test.step(`наличие: размеры в продаже предлагаются, распроданный ${soldOutSizeLabel} — нет`, async () => {
    const offeredSizeLabels = await siteAdapter.readOfferedSizeLabels(page);
    expect(offeredSizeLabels).toEqual(expect.arrayContaining([firstSize.label, secondSize.label]));
    expect(offeredSizeLabels).not.toContain(soldOutSizeLabel);
  });
});
