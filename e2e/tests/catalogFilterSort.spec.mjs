// Фільтр і сортування каталогу (06646): параметри пишуться в URL, сортування
// справді переставляє товари, посилання з параметрами відкриває ту саму
// видачу, а «назад» повертає попередній стан.
// Лише stage: сценарій спирається на товари сида (catalogScenario сайту).
import { CATALOG_SORT_ORDER } from "../config/siteContract.config.mjs";
import {
  isSortedAscending,
  isSortedDescending,
  readListedProductNames,
  readListedProductPrices,
} from "../lib/catalogScenario.mjs";
import { expect, test } from "../lib/fixtures.mjs";

const readDecodedUrl = (page) => decodeURIComponent(page.url());

// Видача довантажується після зміни URL: опитуємо, доки не з'являться товари.
async function waitForListedProducts(page, siteAdapter) {
  await expect
    .poll(async () => (await siteAdapter.readListedProducts(page)).length, { message: "в выдаче нет товаров" })
    .toBeGreaterThan(0);
  return siteAdapter.readListedProducts(page);
}

async function openCategoryWithSizeFilter(page, siteAdapter, catalogScenario) {
  const { categoryPath, filteredSizeLabel, filteredSizeUrlFragment } = catalogScenario;
  await page.goto(categoryPath);
  await waitForListedProducts(page, siteAdapter);
  await siteAdapter.applyCatalogSizeFilter(page, filteredSizeLabel);
  await expect.poll(() => readDecodedUrl(page), { message: "размер не попал в URL" }).toContain(filteredSizeUrlFragment);
}

test("каталог: фильтр и сортировка пишут параметры в URL и переставляют товары @regression", async ({
  page,
  siteAdapter,
  catalogScenario,
}) => {
  const { filteredSizeLabel, filteredSizeUrlFragment, sortUrlFragments } = catalogScenario;

  await test.step(`открыть категорию и выбрать размер ${filteredSizeLabel}`, async () => {
    await openCategoryWithSizeFilter(page, siteAdapter, catalogScenario);
  });

  await test.step("сначала дешёвые: параметр в URL, цены по возрастанию", async () => {
    await siteAdapter.applyCatalogSort(page, CATALOG_SORT_ORDER.cheapestFirst);
    await expect.poll(() => readDecodedUrl(page)).toContain(sortUrlFragments.cheapestFirst);
    expect(readDecodedUrl(page), "сортировка не должна сбрасывать фильтр").toContain(filteredSizeUrlFragment);
    await expect
      .poll(async () => isSortedAscending(readListedProductPrices(await waitForListedProducts(page, siteAdapter))), {
        message: "цены не по возрастанию",
      })
      .toBe(true);
  });

  const cheapestFirstPrices = readListedProductPrices(await siteAdapter.readListedProducts(page));
  expect(
    new Set(cheapestFirstPrices).size,
    "в выдаче должно быть минимум две разные цены, иначе сортировку не проверить (данные сида)",
  ).toBeGreaterThan(1);

  await test.step("сначала дорогие: параметр в URL, цены по убыванию", async () => {
    await siteAdapter.applyCatalogSort(page, CATALOG_SORT_ORDER.mostExpensiveFirst);
    await expect.poll(() => readDecodedUrl(page)).toContain(sortUrlFragments.mostExpensiveFirst);
    expect(readDecodedUrl(page), "сортировка не должна сбрасывать фильтр").toContain(filteredSizeUrlFragment);
    await expect
      .poll(
        async () => {
          const listedPrices = readListedProductPrices(await waitForListedProducts(page, siteAdapter));
          return isSortedDescending(listedPrices) && !isSortedAscending(listedPrices);
        },
        { message: "цены не по убыванию" },
      )
      .toBe(true);
  });
});

test("каталог: ссылка с фильтром и сортировкой открывает ту же выдачу, «назад» возвращает прежнюю @regression", async ({
  page,
  siteAdapter,
  catalogScenario,
}) => {
  const { sortUrlFragments } = catalogScenario;

  const filteredState = await test.step("выдача с фильтром размера", async () => {
    await openCategoryWithSizeFilter(page, siteAdapter, catalogScenario);
    return { url: page.url(), productNames: readListedProductNames(await waitForListedProducts(page, siteAdapter)) };
  });

  const sortedState = await test.step("та же выдача, сначала дорогие", async () => {
    await siteAdapter.applyCatalogSort(page, CATALOG_SORT_ORDER.mostExpensiveFirst);
    await expect.poll(() => readDecodedUrl(page)).toContain(sortUrlFragments.mostExpensiveFirst);
    await expect
      .poll(async () => isSortedDescending(readListedProductPrices(await waitForListedProducts(page, siteAdapter))), {
        message: "цены не по убыванию",
      })
      .toBe(true);
    return { url: page.url(), productNames: readListedProductNames(await siteAdapter.readListedProducts(page)) };
  });

  await test.step("ссылка, открытая в новой вкладке, показывает ту же выдачу", async () => {
    const sharedLinkPage = await page.context().newPage();
    try {
      await sharedLinkPage.goto(sortedState.url);
      await expect
        .poll(async () => readListedProductNames(await siteAdapter.readListedProducts(sharedLinkPage)), {
          message: "выдача по ссылке отличается от исходной",
        })
        .toEqual(sortedState.productNames);
    } finally {
      await sharedLinkPage.close();
    }
  });

  await test.step("«назад» возвращает выдачу до сортировки", async () => {
    await page.goBack();
    await expect.poll(() => page.url(), { message: "«назад» не вернул прежний URL" }).toBe(filteredState.url);
    await expect
      .poll(async () => readListedProductNames(await siteAdapter.readListedProducts(page)), {
        message: "после «назад» выдача не вернулась",
      })
      .toEqual(filteredState.productNames);
  });
});
