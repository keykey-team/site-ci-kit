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
  MOBILE_BROWSER_DEVICE_NAME,
  MOBILE_BROWSER_PROJECT_NAME,
  NAVIGATION_TIMEOUT_MS,
  RUN_RESULTS_FILE,
  RUNNER_ENV_NAMES,
  TEST_OUTPUT_DIRECTORY,
  TEST_TIMEOUT_MS,
  WORKER_COUNT,
} from "./config/runner.config.mjs";
import { buildSiteHttpCredentials } from "./lib/basicAuth.mjs";
import { loadSiteAdapter } from "./lib/siteAdapter.mjs";
import { loadSiteConfig } from "./lib/siteConfig.mjs";
import { readTargetEnvironment } from "./lib/targetEnvironment.mjs";
import { buildMobileTestFilterPattern, buildTestFilterPattern, MOBILE_TEST_PATTERN } from "./lib/testFilter.mjs";

const isContinuousIntegration = Boolean(process.env[RUNNER_ENV_NAMES.isContinuousIntegration]);
const isGithubActions = Boolean(process.env[RUNNER_ENV_NAMES.isGithubActions]);

const targetEnvironment = readTargetEnvironment();
const siteConfig = await loadSiteConfig();
// Неповний адаптер — помилка налаштування сайту: зупиняємо запуск одразу,
// з переліком відсутніх функцій, а не падінням кожного тесту окремо.
await loadSiteAdapter();

const siteBaseUrl = siteConfig.baseUrls[targetEnvironment];

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
  fullyParallel: false,
  workers: WORKER_COUNT,
  retries: isContinuousIntegration ? CI_RETRY_COUNT : 0,
  forbidOnly: isContinuousIntegration,
  reporter: buildReporters(),
  metadata: { siteKey: siteConfig.siteKey, targetEnvironment, siteBaseUrl },
  use: {
    baseURL: siteBaseUrl,
    // Basic-auth stage, обмежений origin сайту. У WebKit цього мало — там ще
    // заголовок із фікстури context (lib/basicAuth.mjs).
    httpCredentials: buildSiteHttpCredentials(siteBaseUrl),
    locale: BROWSER_LOCALE,
    timezoneId: BROWSER_TIMEZONE_ID,
    actionTimeout: ACTION_TIMEOUT_MS,
    navigationTimeout: NAVIGATION_TIMEOUT_MS,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Фільтр задається в кожному проєкті: фільтр проєкту замінює загальний, а
    // не доповнює його (lib/testFilter.mjs). Тест з @mobile іде лише в
    // мобільному проєкті, решта — лише в десктопному.
    {
      name: BROWSER_PROJECT_NAME,
      grep: buildTestFilterPattern(targetEnvironment),
      grepInvert: MOBILE_TEST_PATTERN,
      use: {
        ...devices[BROWSER_DEVICE_NAME],
        channel: process.env[RUNNER_ENV_NAMES.browserChannel] || undefined,
      },
    },
    // Мобільний профіль (06649): тести з тегом @mobile із того самого відбору.
    // У звичайному smoke таких немає — проєкт порожній, WebKit не запускається.
    {
      name: MOBILE_BROWSER_PROJECT_NAME,
      grep: buildMobileTestFilterPattern(targetEnvironment),
      use: { ...devices[MOBILE_BROWSER_DEVICE_NAME] },
    },
  ],
});
