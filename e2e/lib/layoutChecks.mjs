// Перевірки верстки (06649): сторінка не ширша за екран.
import { expect } from "@playwright/test";
import {
  HORIZONTAL_OVERFLOW_REPORTED_ELEMENTS_COUNT,
  HORIZONTAL_OVERFLOW_TOLERANCE_PX,
} from "../config/regressionScenarios.config.mjs";

// Виконується в браузері: ширина сторінки проти ширини екрана й елементи, що
// виступають за правий край (щоб у звіті одразу було видно винуватця).
function measureHorizontalOverflow(reportedElementsCount) {
  const viewportWidth = document.documentElement.clientWidth;
  const pageWidth = document.documentElement.scrollWidth;

  // Лише елементи в межах ширини сторінки: саме вони її розтягують. Панелі,
  // сховані за правим краєм (виїзний кошик, меню), лежать далі за неї і
  // обрізані — покупець до них не доскролить, тож винуватцями вони не є.
  const protrudingElements = [...document.body.querySelectorAll("*")]
    .map((element) => ({ element, elementBox: element.getBoundingClientRect() }))
    .filter(
      ({ elementBox }) =>
        elementBox.width > 0 &&
        elementBox.height > 0 &&
        elementBox.right > viewportWidth + 1 &&
        elementBox.right <= pageWidth + 1,
    )
    .sort((leftEntry, rightEntry) => rightEntry.elementBox.right - leftEntry.elementBox.right)
    .slice(0, reportedElementsCount)
    .map(({ element, elementBox }) => {
      const classNames = typeof element.className === "string" ? element.className.trim().split(/\s+/).join(".") : "";
      return `${element.tagName.toLowerCase()}${classNames ? `.${classNames}` : ""} (правый край ${Math.round(elementBox.right)}px)`;
    });

  return { viewportWidth, pageWidth, protrudingElements };
}

/**
 * Сторінку не можна зсунути вбік: вона не ширша за екран.
 * @param {import("@playwright/test").Page} page
 * @param {string} pageDescription що це за сторінка — для повідомлення («каталог», «оформление»)
 */
export async function expectNoHorizontalOverflow(page, pageDescription) {
  const { viewportWidth, pageWidth, protrudingElements } = await page.evaluate(
    measureHorizontalOverflow,
    HORIZONTAL_OVERFLOW_REPORTED_ELEMENTS_COUNT,
  );
  expect(
    pageWidth,
    `${pageDescription}: страница шире экрана (${pageWidth}px при экране ${viewportWidth}px). ` +
      `Выступают: ${protrudingElements.join("; ") || "элементы не определены"}`,
  ).toBeLessThanOrEqual(viewportWidth + HORIZONTAL_OVERFLOW_TOLERANCE_PX);
}
