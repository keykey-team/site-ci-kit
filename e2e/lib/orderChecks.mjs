import { expect } from "@playwright/test";

// Що перевіряємо в замовленні, яке зберіг сервер (06641, пункт 9 задачі):
// той самий товар, одна штука, ціна з картки товару й сума, що була в кошику.

/** Сума в кошику дорівнює ціні обраного варіанта на картці товару (1 шт.). */
export function expectCartTotalMatchesProductPrice({ cartTotal, unitPrice }) {
  expect(unitPrice, "цена на карточке товара не прочитана").toBeGreaterThan(0);
  expect(cartTotal, "сумма в корзине ≠ цене товара (1 шт.)").toBe(unitPrice);
}

/** Збережене замовлення: одна позиція того SKU, ціна й сума — як у кошику. */
export function expectStoredOrderMatchesCart(storedOrder, { sku, unitPrice, cartTotal }) {
  expect(storedOrder.items, "позиции заказа в базе").toHaveLength(1);
  const [storedItem] = storedOrder.items;
  expect(storedItem.sku, "SKU в заказе").toBe(sku);
  expect(storedItem.quantity, "количество в заказе").toBe(1);
  expect(storedItem.unitPrice, "цена позиции в заказе").toBe(unitPrice);
  expect(storedOrder.itemsTotalAmount, "сумма товаров в заказе ≠ сумме корзины").toBe(cartTotal);
}
