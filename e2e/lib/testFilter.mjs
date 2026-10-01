import { DEFAULT_TEST_TAG, PROD_SAFE_TAG, RUNNER_ENV_NAMES } from "../config/runner.config.mjs";
import { isProdEnvironment } from "./targetEnvironment.mjs";

function escapeRegularExpression(literalText) {
  return literalText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Які тести запускати: тег з E2E_GREP (за замовчуванням @smoke), а на проді —
 * лише ті, що водночас мають @prod-safe. Фільтр живе в конфігу бібліотеки, а
 * не лише в smoke.yml, щоб і локальний запуск на прод не зачепив тести із записом.
 */
export function buildTestFilterPattern(targetEnvironment) {
  const requestedTag = process.env[RUNNER_ENV_NAMES.requestedTestTag] || DEFAULT_TEST_TAG;
  const requestedTagLookahead = `(?=.*(?:${requestedTag}))`;
  if (!isProdEnvironment(targetEnvironment)) return new RegExp(requestedTagLookahead);
  return new RegExp(`^${requestedTagLookahead}(?=.*${escapeRegularExpression(PROD_SAFE_TAG)})`);
}
