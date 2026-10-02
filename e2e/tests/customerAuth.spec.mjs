// Вхід і вихід покупця (06640). З 06641 — після виходу старий токен
// відкликаний на сервері, а не лише стертий у браузері: інакше вкрадена кука
// працювала б і після «Вийти». Лише stage: вхід по коду з env працює тільки
// там (E2E_TEST_LOGIN_ENABLED, §4 контракту). Без секретів тестового
// покупця тест пропускається з поясненням.
import { HTTP_OK_STATUS } from "../config/pageChecks.config.mjs";
import { REJECTED_SESSION_HTTP_STATUSES } from "../config/testOrder.config.mjs";
import { expect, test } from "../lib/fixtures.mjs";
import { readCustomerProfileStatus } from "../lib/siteApi.mjs";

test("покупатель входит и выходит из кабинета @smoke", async ({
  page,
  request,
  siteConfig,
  siteAdapter,
  customerCredentials,
}) => {
  await test.step("войти по телефону и коду", async () => {
    await siteAdapter.loginCustomer(page, customerCredentials);
  });
  await test.step("кабинет открыт", async () => {
    await siteAdapter.expectCustomerLoggedIn(page);
  });
  const customerSessionToken = await test.step("токен сессии принимается API", async () => {
    const sessionToken = await siteAdapter.readCustomerSessionToken(page);
    expect(sessionToken, "токен сессии покупателя не найден").toBeTruthy();
    expect(await readCustomerProfileStatus(request, siteConfig, sessionToken), "API с живым токеном").toBe(HTTP_OK_STATUS);
    return sessionToken;
  });
  await test.step("выйти", async () => {
    await siteAdapter.logoutCustomer(page);
  });
  await test.step("кабинет закрыт", async () => {
    await siteAdapter.expectCustomerLoggedOut(page);
  });
  await test.step("старый токен после выхода отклоняется", async () => {
    const profileStatusAfterLogout = await readCustomerProfileStatus(request, siteConfig, customerSessionToken);
    expect(REJECTED_SESSION_HTTP_STATUSES, `API принял токен после выхода (${profileStatusAfterLogout})`).toContain(
      profileStatusAfterLogout,
    );
  });
});
