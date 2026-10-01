// Вхід і вихід покупця (06640). Лише stage: вхід по коду з env працює тільки
// там (E2E_TEST_LOGIN_ENABLED, §4 контракту). Без секретів тестового
// покупця тест пропускається з поясненням.
import { test } from "../lib/fixtures.mjs";

test("покупатель входит и выходит из кабинета @smoke", async ({ page, siteAdapter, customerCredentials }) => {
  await test.step("войти по телефону и коду", async () => {
    await siteAdapter.loginCustomer(page, customerCredentials);
  });
  await test.step("кабинет открыт", async () => {
    await siteAdapter.expectCustomerLoggedIn(page);
  });
  await test.step("выйти", async () => {
    await siteAdapter.logoutCustomer(page);
  });
  await test.step("кабинет закрыт", async () => {
    await siteAdapter.expectCustomerLoggedOut(page);
  });
});
