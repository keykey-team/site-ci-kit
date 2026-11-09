// Замовлення з особистого кабінету (07427, Power Pro): покупець замовляє в
// кабінеті без форми контактів — ПІБ і телефон сайт бере з профілю, а
// замовлення з'являється в історії кабінету. Для сайтів, де кабінет лише
// підставляє дані у форму вітрини, є authorizedCheckout.spec.mjs.
// Лише stage (немає @prod-safe): звичайне замовлення тестового покупця сида.
import { test } from "../lib/fixtures.mjs";

test("заказ из личного кабинета берёт контакты из профиля и виден в кабинете @smoke", async ({
  page,
  siteAdapter,
  customerCredentials,
  customerAccountOrderScenario,
}) => {
  await test.step("войти покупателем", () => siteAdapter.loginCustomer(page, customerCredentials));
  const { orderNumber } = await test.step(`заказать «${customerAccountOrderScenario.productName}» из кабинета`, () =>
    siteAdapter.placeOrderFromCustomerAccount(page, customerAccountOrderScenario),
  );
  test.info().annotations.push({ type: "order", description: orderNumber });
  await test.step("в заказе имя, фамилия и телефон из профиля", () =>
    siteAdapter.expectAccountOrderContactsFromProfile(page, orderNumber),
  );
  await test.step("заказ виден в кабинете", () => siteAdapter.expectOrderInCustomerAccount(page, orderNumber));
});
