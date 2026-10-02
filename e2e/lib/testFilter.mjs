import { DEFAULT_TEST_TAG, PROD_SAFE_TAG, RUNNER_ENV_NAMES, TEST_ORDER_TAG } from "../config/runner.config.mjs";
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

/** Тест допущено на прод: має @prod-safe або @test-order. */
export function isAllowedOnProd(testTags) {
  return PROD_ALLOWED_TAGS.some((prodAllowedTag) => testTags.includes(prodAllowedTag));
}
