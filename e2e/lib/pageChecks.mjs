import { expect } from "@playwright/test";
import {
  NOINDEX_PATTERN,
  PAGE_ERROR_SELECTORS,
  PAGE_ERROR_TEXTS,
  ROBOTS_HEADER_NAME,
  ROBOTS_META_SELECTOR,
} from "../config/pageChecks.config.mjs";

/** Сторінка не показує екран помилки Next.js (404/500 чи впалий клієнтський рендер). */
export async function expectNoErrorScreen(page) {
  for (const errorSelector of PAGE_ERROR_SELECTORS) {
    await expect(page.locator(errorSelector), `на странице экран ошибки (${errorSelector})`).toHaveCount(0);
  }
  for (const errorText of PAGE_ERROR_TEXTS) {
    await expect(page.getByText(errorText), `на странице текст ошибки «${errorText}»`).toHaveCount(0);
  }
}

/** Директиви robots з meta-тегів відкритої сторінки (robots і googlebot). */
export async function readRobotsMetaDirectives(page) {
  const robotsMetaTags = page.locator(ROBOTS_META_SELECTOR);
  const directives = await robotsMetaTags.evaluateAll((metaTags) =>
    metaTags.map((metaTag) => metaTag.getAttribute("content") ?? ""),
  );
  return directives.join(", ");
}

/** Відповідь і сторінка не забороняють індексацію (ні X-Robots-Tag, ні meta robots). */
export async function expectPageIndexable(page, pageResponse) {
  const robotsHeader = pageResponse.headers()[ROBOTS_HEADER_NAME] ?? "";
  expect(robotsHeader, `${ROBOTS_HEADER_NAME} запрещает индексацию`).not.toMatch(NOINDEX_PATTERN);
  expect(await readRobotsMetaDirectives(page), "meta robots запрещает индексацию").not.toMatch(NOINDEX_PATTERN);
}
