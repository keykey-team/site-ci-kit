import {
  DEFAULT_TEST_TAG,
  MOBILE_TAG,
  PROD_SAFE_TAG,
  RUNNER_ENV_NAMES,
  TEST_ORDER_TAG,
} from "../config/runner.config.mjs";
import { isProdEnvironment } from "./targetEnvironment.mjs";

function escapeRegularExpression(literalText) {
  return literalText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Теги, з якими тест допущено на прод: нічого не пише або пише лише тестове
// замовлення, яке сервер сайту не рахує (06641).
const PROD_ALLOWED_TAGS = [PROD_SAFE_TAG, TEST_ORDER_TAG];

/**
 * Які тести запускати: тег з E2E_GREP (за замовчуванням @smoke), а на проді —
 * лише ті, що водночас мають @prod-safe або @test-order. Фільтр живе в конфігу
 * бібліотеки, а не лише в smoke.yml, щоб і локальний запуск на прод не зачепив
 * тести із записом.
 */
export function buildTestFilterPattern(targetEnvironment) {
  const requestedTag = process.env[RUNNER_ENV_NAMES.requestedTestTag] || DEFAULT_TEST_TAG;
  const requestedTagLookahead = `(?=.*(?:${requestedTag}))`;
  if (!isProdEnvironment(targetEnvironment)) return new RegExp(requestedTagLookahead);
  const prodAllowedTagsPattern = PROD_ALLOWED_TAGS.map(escapeRegularExpression).join("|");
  return new RegExp(`^${requestedTagLookahead}(?=.*(?:${prodAllowedTagsPattern}))`);
}

/** Тести мобільного профілю: назва містить @mobile. */
export const MOBILE_TEST_PATTERN = new RegExp(escapeRegularExpression(MOBILE_TAG));

/**
 * Фільтр мобільного проєкту (06649): той самий відбір, що й у
 * buildTestFilterPattern, і ще тег @mobile.
 *
 * Окрема функція, а не `grep: /@mobile/` у проєкті: фільтр проєкту в Playwright
 * ЗАМІНЮЄ загальний, а не доповнює. З голим /@mobile/ мобільний тест потрапляв
 * би у звичайний smoke (і валив гейт прода: WebKit там не встановлено) і в
 * запуск на проді — в обхід відбору за тегом і за @prod-safe.
 */
export function buildMobileTestFilterPattern(targetEnvironment) {
  const requestedTestsPattern = buildTestFilterPattern(targetEnvironment);
  return new RegExp(`${requestedTestsPattern.source}(?=.*${MOBILE_TEST_PATTERN.source})`);
}

/** Тест допущено на прод: має @prod-safe або @test-order. */
export function isAllowedOnProd(testTags) {
  return PROD_ALLOWED_TAGS.some((prodAllowedTag) => testTags.includes(prodAllowedTag));
}
