// Доступ до адмінки (06640) під тестовим адміном із сиду stage. Лише stage:
// на проді облікових даних адміна в CI немає й не повинно бути.
import { test } from "../lib/fixtures.mjs";

test("администратор входит в админку @smoke", async ({ page, siteAdapter, adminCredentials }) => {
  await test.step("войти в админку", async () => {
    await siteAdapter.loginAdmin(page, adminCredentials);
  });
  await test.step("панель админки видна", async () => {
    await siteAdapter.expectAdminPanel(page);
  });
});
