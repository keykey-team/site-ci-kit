// Конфіг запуску smoke/E2E (06640). Що й де тестувати, визначає репозиторій
// сайту: SITE_E2E_DIR → site.config.mjs + site.adapter.mjs; E2E_TARGET_ENV —
// stage або prod. Тут — лише однакові для всіх сайтів правила запуску.
import { defineConfig, devices } from "@playwright/test";
import {
  ACTION_TIMEOUT_MS,
  BROWSER_DEVICE_NAME,
  BROWSER_LOCALE,
  BROWSER_PROJECT_NAME,
  BROWSER_TIMEZONE_ID,
  CI_RETRY_COUNT,
  EXPECT_TIMEOUT_MS,
  HTML_REPORT_DIRECTORY,
  NAVIGATION_TIMEOUT_MS,
  RUN_RESULTS_FILE,
  RUNNER_ENV_NAMES,
  TEST_OUTPUT_DIRECTORY,
  TEST_TIMEOUT_MS,
  WORKER_COUNT,
} from "./config/runner.config.mjs";
import { SECRET_ENV_NAMES } from "./config/siteContract.config.mjs";
import { loadSiteAdapter } from "./lib/siteAdapter.mjs";
import { loadSiteConfig } from "./lib/siteConfig.mjs";
import { readTargetEnvironment } from "./lib/targetEnvironment.mjs";
import { buildTestFilterPattern } from "./lib/testFilter.mjs";

const isContinuousIntegration = Boolean(process.env[RUNNER_ENV_NAMES.isContinuousIntegration]);
const isGithubActions = Boolean(process.env[RUNNER_ENV_NAMES.isGithubActions]);

const targetEnvironment = readTargetEnvironment();
const siteConfig = await loadSiteConfig();
// Неповний адаптер — помилка налаштування сайту: зупиняємо запуск одразу,
// з переліком відсутніх функцій, а не падінням кожного тесту окремо.
await loadSiteAdapter();

const siteBaseUrl = siteConfig.baseUrls[targetEnvironment];

// Basic-auth stage. Обмежено origin сайту: на сторонні домени (НП, аналітика)
// логін і пароль не підуть, навіть якщо ті відповідять 401.
function buildBasicAuthCredentials() {
  const basicAuthUser = process.env[SECRET_ENV_NAMES.basicAuthUser];
  const basicAuthPassword = process.env[SECRET_ENV_NAMES.basicAuthPassword];
  if (!basicAuthUser || !basicAuthPassword) return undefined;
  return { username: basicAuthUser, password: basicAuthPassword, origin: new URL(siteBaseUrl).origin };
}

function buildReporters() {
  const reporters = [
    ["list"],
    ["html", { outputFolder: HTML_REPORT_DIRECTORY, open: "never" }],
    ["json", { outputFile: RUN_RESULTS_FILE }],
  ];
  // Анотації з упалими тестами просто на сторінці запуску в Actions.
  if (isGithubActions) reporters.push(["github"]);
  return reporters;
}

export default defineConfig({
  testDir: "./tests",
  outputDir: TEST_OUTPUT_DIRECTORY,
  timeout: TEST_TIMEOUT_MS,
  expect: { timeout: EXPECT_TIMEOUT_MS },
  grep: buildTestFilterPattern(targetEnvironment),
  fullyParallel: false,
  workers: WORKER_COUNT,
  retries: isContinuousIntegration ? CI_RETRY_COUNT : 0,
  forbidOnly: isContinuousIntegration,
  reporter: buildReporters(),
  metadata: { siteKey: siteConfig.siteKey, targetEnvironment, siteBaseUrl },
  use: {
    baseURL: siteBaseUrl,
    httpCredentials: buildBasicAuthCredentials(),
    locale: BROWSER_LOCALE,
    timezoneId: BROWSER_TIMEZONE_ID,
    actionTimeout: ACTION_TIMEOUT_MS,
    navigationTimeout: NAVIGATION_TIMEOUT_MS,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: BROWSER_PROJECT_NAME,
      use: {
        ...devices[BROWSER_DEVICE_NAME],
        channel: process.env[RUNNER_ENV_NAMES.browserChannel] || undefined,
      },
    },
  ],
});
