// Порожня видача каталогу (06646): якщо фільтри нічого не знайшли, покупець
// бачить зрозуміле повідомлення, а скидання фільтрів повертає товари.
// Лише stage: сценарій спирається на товари сида (catalogScenario сайту).
import { expect, test } from "../lib/fixtures.mjs";

test("каталог без товаров показывает сообщение, сброс фильтров возвращает список @regression", async ({
  page,
  siteAdapter,
  catalogScenario,
}) => {
  const { emptyResultPath } = catalogScenario;

  await test.step(`открыть ${emptyResultPath}`, async () => {
    await page.goto(emptyResultPath);
  });
  await test.step("видно сообщение, товаров нет", async () => {
    await siteAdapter.expectCatalogEmptyState(page);
    expect(await siteAdapter.readListedProducts(page)).toEqual([]);
  });
  await test.step("сбросить фильтры — товары появились", async () => {
    await siteAdapter.resetCatalogFilters(page);
    await expect
      .poll(async () => (await siteAdapter.readListedProducts(page)).length, { message: "после сброса товаров нет" })
      .toBeGreaterThan(0);
  });
});
