// Помилки в консолі браузера на сторінці (06641, пункт 8 задачі).
// Рахуються: необроблені винятки сторінки (pageerror) і console.error зі
// скриптів самого сайту. console.error сторонніх скриптів (пікселі, віджети)
// сайт виправити не може — вони не рахуються; відомий шум сайт перелічує в
// consoleErrorIgnorePatterns свого site.config.mjs.

function isSiteOwnedLocation(locationUrl, siteOrigin) {
  if (!locationUrl) return true;
  try {
    return new URL(locationUrl).origin === siteOrigin;
  } catch {
    return true;
  }
}

function buildIgnoredErrorMatchers(ignorePatternSources = []) {
  return ignorePatternSources.map((ignorePatternSource) => new RegExp(ignorePatternSource));
}

/**
 * Починає збирати помилки на сторінці й повертає функцію, що віддає їх список
 * (тексти для звіту). Викликати до page.goto.
 */
export function collectPageErrors(page, { siteOrigin, ignorePatternSources }) {
  const ignoredErrorMatchers = buildIgnoredErrorMatchers(ignorePatternSources);
  const collectedErrorTexts = [];
  const rememberUnlessIgnored = (errorText) => {
    if (ignoredErrorMatchers.some((ignoredErrorMatcher) => ignoredErrorMatcher.test(errorText))) return;
    collectedErrorTexts.push(errorText);
  };

  page.on("pageerror", (pageError) => rememberUnlessIgnored(`pageerror: ${pageError.message}`));
  page.on("console", (consoleMessage) => {
    if (consoleMessage.type() !== "error") return;
    const locationUrl = consoleMessage.location().url;
    if (!isSiteOwnedLocation(locationUrl, siteOrigin)) return;
    rememberUnlessIgnored(`console.error: ${consoleMessage.text()}${locationUrl ? ` (${locationUrl})` : ""}`);
  });

  return () => [...collectedErrorTexts];
}
