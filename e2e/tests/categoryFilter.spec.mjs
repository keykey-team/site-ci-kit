// Фільтр категорії (06640): повертає товари і пише параметри у URL — інакше
// відфільтровану видачу не можна відкрити за посиланням чи проіндексувати.
import { expect, test } from "../lib/fixtures.mjs";

test("фильтр категории возвращает товары и пишет параметр в URL @smoke @prod-safe", async ({
  page,
  siteConfig,
  siteAdapter,
}) => {
  const { categoryPath, expectedUrlParam } = siteConfig.categoryFilter;

  await test.step(`открыть ${categoryPath}`, async () => {
    await page.goto(categoryPath);
  });
  await test.step("поставить фильтр", async () => {
    await siteAdapter.applyCategoryFilter(page, siteConfig);
  });
  await test.step(`в URL есть ${expectedUrlParam}`, async () => {
    await expect.poll(() => decodeURIComponent(page.url()), { message: "параметр фильтра в URL" }).toContain(
      expectedUrlParam,
    );
  });
  await test.step("в выдаче есть товары", async () => {
    await expect.poll(() => siteAdapter.readListedProductCount(page), { message: "товаров после фильтра" }).toBeGreaterThan(0);
  });
});
