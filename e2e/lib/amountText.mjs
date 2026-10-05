// Сума з тексту сторінки: «Оплатити 1 950 ₴», «950,50 грн» → 1950, 950.5.

/**
 * @param {string} amountText текст із сумою
 * @param {string} amountDescription що це за сума — для повідомлення про помилку
 * @returns {number} сума в гривнях
 */
export function readAmountFromText(amountText, amountDescription) {
  const amountDigits = String(amountText).replace(/[^\d,.]/g, "").replace(",", ".");
  const amount = amountDigits ? Number(amountDigits) : Number.NaN;
  // Не число — падаємо з текстом, а не тихо порівнюємо NaN.
  if (!Number.isFinite(amount)) throw new Error(`${amountDescription}: не число в «${amountText}»`);
  return amount;
}
