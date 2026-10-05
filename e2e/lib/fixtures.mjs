import { test as playwrightTest, expect } from "@playwright/test";
import { PROD_SAFE_TAG, TEST_ORDER_TAG, WEBKIT_BROWSER_NAME } from "../config/runner.config.mjs";
import {
  CATALOG_SCENARIO_CONFIG_KEY,
  OPTIONAL_SCENARIO_CONTRACT,
  SECRET_ENV_NAMES,
} from "../config/siteContract.config.mjs";
import { sendBasicAuthToSiteOnly } from "./basicAuth.mjs";
import { describeCatalogScenarioGap } from "./catalogScenario.mjs";
import { createFakeBuyer, createTestOrderBuyer } from "./fakeBuyer.mjs";
import { stubNovaPoshtaApi } from "./novaPoshtaStub.mjs";
import { describeOptionalScenarioGap } from "./optionalScenario.mjs";
import { loadSiteAdapter } from "./siteAdapter.mjs";
import { loadSiteConfig } from "./siteConfig.mjs";
import { isProdEnvironment, readTargetEnvironment } from "./targetEnvironment.mjs";
import { isAllowedOnProd } from "./testFilter.mjs";

/**
 * Значення секретів з env. Якщо хоч одного немає — тест пропускається (не
 * падає) з поясненням: сайт, що ще не завів тестового покупця чи адміна,
 * бачить у звіті, чого бракує, а решта smoke лишається зеленою.
 */
function readSecretsOrSkipTest(testInfo, secretEnvNames) {
  const missingSecretNames = Object.values(secretEnvNames).filter((secretEnvName) => !process.env[secretEnvName]);
  testInfo.skip(
    missingSecretNames.length > 0,
    `Нет секретов ${missingSecretNames.join(", ")} — тест пропущен. Добавьте их в Settings → Secrets and variables → Actions репозитория сайта и передайте в smoke.yml`,
  );
  return Object.fromEntries(
    Object.entries(secretEnvNames).map(([credentialName, secretEnvName]) => [credentialName, process.env[secretEnvName]]),
  );
}

/**
 * Фікстура необов'язкового сценарію регресії (06649): блок сценарію з
 * site.config.mjs. Сайт, який сценарій не підключив, тест пропускає з
 * поясненням, чого бракує, — решта набору лишається зеленою.
 */
function createOptionalScenarioFixture(scenarioContract) {
  return async ({ siteConfig, siteAdapter }, use, testInfo) => {
    const scenarioGap = describeOptionalScenarioGap(siteConfig, siteAdapter, scenarioContract);
    testInfo.skip(Boolean(scenarioGap), `${scenarioGap} — тест пропущен`);
    await use(siteConfig[scenarioContract.configKey]);
  };
}

export const test = playwrightTest.extend({
  targetEnvironment: [
    async ({}, use) => {
      await use(readTargetEnvironment());
    },
    { scope: "worker" },
  ],

  siteConfig: [
    async ({}, use) => {
      await use(await loadSiteConfig());
    },
    { scope: "worker" },
  ],

  siteAdapter: [
    async ({}, use) => {
      await use(await loadSiteAdapter());
    },
    { scope: "worker" },
  ],

  // Друга лінія захисту проду після фільтра запуску (testFilter.mjs): навіть
  // якщо фільтр обійдено (свій --config, правка testFilter), тест без
  // @prod-safe чи @test-order на проді не виконується.
  prodWriteProtection: [
    async ({ targetEnvironment }, use, testInfo) => {
      testInfo.skip(
        isProdEnvironment(targetEnvironment) && !isAllowedOnProd(testInfo.tags),
        `Тест без ${PROD_SAFE_TAG} / ${TEST_ORDER_TAG} — только для stage (может писать данные), на проде не запускается`,
      );
      await use();
    },
    { auto: true },
  ],

  // У WebKit basic-auth stage з налаштувань запуску не спрацьовує на
  // стандартному порту — заголовок додається тут (lib/basicAuth.mjs).
  context: async ({ context, browserName, baseURL }, use) => {
    if (browserName === WEBKIT_BROWSER_NAME) await sendBasicAuthToSiteOnly(context, baseURL);
    await use(context);
  },

  // Кожна сторінка тестів одразу з підміною API Нової пошти.
  page: async ({ page, siteConfig }, use) => {
    await stubNovaPoshtaApi(page, siteConfig.novaPoshta);
    await use(page);
  },

  buyer: async ({}, use) => {
    await use(createFakeBuyer());
  },

  // Покупець тестового замовлення: нічий номер +380100000001 (06641).
  testOrderBuyer: async ({}, use) => {
    await use(createTestOrderBuyer());
  },

  // Секрет тестового замовлення. Ним же читаються замовлення й залишок через
  // API сайту, тому без нього пропускаються всі тести, що перевіряють базу.
  testOrderToken: async ({}, use, testInfo) => {
    const { testOrderToken } = readSecretsOrSkipTest(testInfo, { testOrderToken: SECRET_ENV_NAMES.testOrderToken });
    await use(testOrderToken);
  },

  customerCredentials: async ({}, use, testInfo) => {
    const { customerPhone, customerOtpCode } = readSecretsOrSkipTest(testInfo, {
      customerPhone: SECRET_ENV_NAMES.customerPhone,
      customerOtpCode: SECRET_ENV_NAMES.customerOtpCode,
    });
    await use({ phone: customerPhone, otpCode: customerOtpCode });
  },

  // Дані регресії каталогу з site.config.mjs (06646). Сайт, який її не
  // підключив (немає блока catalogScenario чи кроків адаптера), ці тести
  // пропускає з поясненням — решта набору лишається зеленою.
  catalogScenario: async ({ siteConfig, siteAdapter }, use, testInfo) => {
    const catalogScenarioGap = describeCatalogScenarioGap(siteConfig, siteAdapter);
    testInfo.skip(Boolean(catalogScenarioGap), `${catalogScenarioGap} — тест пропущен`);
    await use(siteConfig[CATALOG_SCENARIO_CONFIG_KEY]);
  },

  adminCredentials: async ({}, use, testInfo) => {
    const { adminLogin, adminPassword } = readSecretsOrSkipTest(testInfo, {
      adminLogin: SECRET_ENV_NAMES.adminLogin,
      adminPassword: SECRET_ENV_NAMES.adminPassword,
    });
    await use({ login: adminLogin, password: adminPassword });
  },

  // Сценарії регресії другого пріоритету (06649), кожен підключається окремо.
  cartVariantsScenario: createOptionalScenarioFixture(OPTIONAL_SCENARIO_CONTRACT.cartVariants),
  adminCatalogEditScenario: createOptionalScenarioFixture(OPTIONAL_SCENARIO_CONTRACT.adminCatalogEdit),
  mobileCheckoutScenario: createOptionalScenarioFixture(OPTIONAL_SCENARIO_CONTRACT.mobileCheckout),
  onlinePaymentScenario: createOptionalScenarioFixture(OPTIONAL_SCENARIO_CONTRACT.onlinePayment),

  // Вкладка покупця без входу в окремому браузерному контексті: поки в
  // основній вкладці працює адмін, вітрину дивимось так, як її бачить
  // сторонній покупець — без кук адміна. Налаштування (адреса сайту,
  // basic-auth, мова) контекст успадковує з конфігу запуску.
  anonymousBuyerPage: async ({ browser, browserName, baseURL }, use) => {
    const anonymousBuyerContext = await browser.newContext();
    if (browserName === WEBKIT_BROWSER_NAME) await sendBasicAuthToSiteOnly(anonymousBuyerContext, baseURL);
    await use(await anonymousBuyerContext.newPage());
    await anonymousBuyerContext.close();
  },
});

export { expect };
