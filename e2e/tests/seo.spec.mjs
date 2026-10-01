// SEO-мінімум (06640): sitemap.xml, robots.txt і відсутність noindex на проді.
// stage закритий від індексації навмисно (basic-auth, noindex), тому там
// перевіряється лише те, що файли віддаються.
import {
  HTTP_OK_STATUS,
  ROBOTS_SITEMAP_DIRECTIVE_PATTERN,
  SITEMAP_ROOT_MARKERS,
} from "../config/pageChecks.config.mjs";
import { expect, test } from "../lib/fixtures.mjs";
import { expectPageIndexable } from "../lib/pageChecks.mjs";
import { loadSiteConfig } from "../lib/siteConfig.mjs";
import { isProdEnvironment } from "../lib/targetEnvironment.mjs";

const siteConfig = await loadSiteConfig();
const STAGE_NOINDEX_SKIP_REASON = "stage намеренно закрыт от индексации — содержимое проверяется только на проде";

test.describe("SEO", () => {
  test("sitemap.xml отвечает 200 @smoke @prod-safe", async ({ request }) => {
    const sitemapResponse = await request.get(siteConfig.seo.sitemapPath);
    expect(sitemapResponse.status(), siteConfig.seo.sitemapPath).toBe(HTTP_OK_STATUS);
  });

  test("robots.txt отвечает 200 @smoke @prod-safe", async ({ request }) => {
    const robotsResponse = await request.get(siteConfig.seo.robotsPath);
    expect(robotsResponse.status(), siteConfig.seo.robotsPath).toBe(HTTP_OK_STATUS);
  });

  test("sitemap.xml содержит urlset или sitemapindex @smoke @prod-safe", async ({ request, targetEnvironment }) => {
    test.skip(!isProdEnvironment(targetEnvironment), STAGE_NOINDEX_SKIP_REASON);
    const sitemapXml = await (await request.get(siteConfig.seo.sitemapPath)).text();
    const hasSitemapRoot = SITEMAP_ROOT_MARKERS.some((rootMarker) => sitemapXml.includes(rootMarker));
    expect(hasSitemapRoot, `${siteConfig.seo.sitemapPath}: нет ${SITEMAP_ROOT_MARKERS.join(" / ")}`).toBe(true);
  });

  test("robots.txt указывает Sitemap @smoke @prod-safe", async ({ request, targetEnvironment }) => {
    test.skip(!isProdEnvironment(targetEnvironment), STAGE_NOINDEX_SKIP_REASON);
    const robotsText = await (await request.get(siteConfig.seo.robotsPath)).text();
    expect(robotsText, `${siteConfig.seo.robotsPath}: нет строки Sitemap:`).toMatch(ROBOTS_SITEMAP_DIRECTIVE_PATTERN);
  });

  for (const indexedPath of siteConfig.seo.indexedPaths) {
    test(`${indexedPath} открыт для индексации @smoke @prod-safe`, async ({ page, targetEnvironment }) => {
      test.skip(!isProdEnvironment(targetEnvironment), STAGE_NOINDEX_SKIP_REASON);
      const pageResponse = await page.goto(indexedPath);
      expect(pageResponse, `${indexedPath}: нет ответа сервера`).not.toBeNull();
      await expectPageIndexable(page, pageResponse);
    });
  }
});
