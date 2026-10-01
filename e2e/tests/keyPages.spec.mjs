// Доступність ключових сторінок (06640): головна, категорія, товар, пошук і
// будь-які додаткові з keyPages у site.config.mjs.
import { HTTP_ERROR_STATUS_MIN } from "../config/pageChecks.config.mjs";
import { expect, test } from "../lib/fixtures.mjs";
import { expectNoErrorScreen } from "../lib/pageChecks.mjs";
import { loadSiteConfig } from "../lib/siteConfig.mjs";

// Тест на кожну сторінку — щоб у звіті було видно, яка саме впала.
const siteConfig = await loadSiteConfig();

test.describe("Ключевые страницы", () => {
  for (const [keyPageName, keyPage] of Object.entries(siteConfig.keyPages)) {
    test(`${keyPageName} (${keyPage.path}) открывается без ошибки @smoke @prod-safe`, async ({ page }) => {
      const pageResponse = await page.goto(keyPage.path);

      expect(pageResponse, `${keyPage.path}: нет ответа сервера`).not.toBeNull();
      expect(pageResponse.status(), `${keyPage.path}: код ответа`).toBeLessThan(HTTP_ERROR_STATUS_MIN);
      // Адаптивна верстка часто тримає дві копії блоку (десктоп і мобільна),
      // одна з них прихована — шукаємо видиму.
      await expect(
        page.locator(keyPage.readySelector).filter({ visible: true }).first(),
        `${keyPage.path}: не появился «${keyPage.readySelector}»`,
      ).toBeVisible();
      await expectNoErrorScreen(page);
    });
  }
});
