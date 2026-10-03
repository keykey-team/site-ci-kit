// Параметри запуску Playwright, однакові для всіх сайтів. Дані конкретного
// сайту (URL, сторінки, селектори) тут не живуть — вони в його репозиторії:
// <SITE_E2E_DIR>/site.config.mjs і site.adapter.mjs (docs/site-contract.md §3).

// Змінні оточення, якими раннер керує запуском. Їх виставляє smoke.yml;
// локально — сам розробник (README, «Локальний запуск»).
export const RUNNER_ENV_NAMES = {
  siteE2eDirectory: "SITE_E2E_DIR",
  targetEnvironment: "E2E_TARGET_ENV",
  requestedTestTag: "E2E_GREP",
  // Лише для локального запуску: "msedge" бере вже встановлений Edge, щоб не
  // завантажувати Chromium (~150 МБ) на машину розробника. У CI не задається.
  browserChannel: "E2E_BROWSER_CHANNEL",
  isContinuousIntegration: "CI",
  isGithubActions: "GITHUB_ACTIONS",
};

export const TARGET_ENVIRONMENTS = {
  stage: "stage",
  prod: "prod",
};

// Без явного оточення — stage: випадковий запуск без змінних не має йти
// на прод, хоч на проді й так виконуються лише тести без запису.
export const DEFAULT_TARGET_ENVIRONMENT = TARGET_ENVIRONMENTS.stage;

// Які тести бере CI за замовчуванням.
export const DEFAULT_TEST_TAG = "@smoke";

// Тести, що нічого не пишуть (сторінки, SEO, фільтр). На проді запускаються
// лише вони — це гарантує і фільтр запуску, і фікстура prodWriteProtection.
export const PROD_SAFE_TAG = "@prod-safe";

// Єдиний тест, якому дозволено писати на проді (06641): тестове замовлення з
// заголовком-секретом. Сервер сайту позначає його isTest — склад, бонуси,
// метрики й аналітика не рухаються, у CRM воно одразу скасовується.
export const TEST_ORDER_TAG = "@test-order";

// Регресія (06646): докладні сценарії другого пріоритету — фільтри й
// сортування каталогу, вибір розміру. Не входять у @smoke і в гейт прода:
// сайт запускає їх окремим викликом smoke.yml (grep: "@regression") зі своїм
// статусом коміту. Лише stage: спираються на товари сида.
export const REGRESSION_TAG = "@regression";

// Оформлення замовлення — це ~10 кроків, кожен з запитом до API stage.
// 90 с — із запасом на повільний stage, але зависання не тягнеться до
// timeout-minutes джоба (15 хв).
export const TEST_TIMEOUT_MS = 90_000;

// Скільки expect чекає на появу елемента: SSR-сторінка з гідратацією на stage
// відмальовується за 2–5 с, 10 с — запас без маскування реального зависання.
export const EXPECT_TIMEOUT_MS = 10_000;

// Перехід на сторінку: холодний stage після деплою віддає першу сторінку
// до ~20 с (прогрів Next.js), 30 с покривають це.
export const NAVIGATION_TIMEOUT_MS = 30_000;

// Клік / заповнення поля. Більше 15 с — це вже не повільний UI, а поломка.
export const ACTION_TIMEOUT_MS = 15_000;

// Один повтор у CI відсіює мережеві збої раннера; тест, що пройшов лише з
// повтору, звіт позначає як flaky — це видно, а не приховано.
export const CI_RETRY_COUNT = 1;

// Тести одного сайту ходять під одним тестовим покупцем і кладуть у кошик той
// самий товар: паралельний вихід з акаунта або оформлення ламав би сусідній
// тест. Послідовно весь набір іде ~2–3 хв — це вкладається в 15 хв джоба.
export const WORKER_COUNT = 1;

// Шляхи — відносно каталогу e2e/ бібліотеки. smoke.yml завантажує
// HTML_REPORT_DIRECTORY як артефакт, а RUN_RESULTS_FILE читає для зведення.
export const HTML_REPORT_DIRECTORY = "playwright-report";
export const TEST_OUTPUT_DIRECTORY = "test-results";
export const RUN_RESULTS_FILE = "test-results/run-results.json";

// Профіль браузера: десктоп, як у більшості покупців з кошиком.
export const BROWSER_DEVICE_NAME = "Desktop Chrome";
export const BROWSER_PROJECT_NAME = "chromium";

// Мова й часовий пояс покупця: сайти українські, інакше частина текстів і дат
// на сторінці відрізнялася б від того, що бачить людина.
export const BROWSER_LOCALE = "uk-UA";
export const BROWSER_TIMEZONE_ID = "Europe/Kyiv";
