// Basic-auth stage: логін і пароль лише для origin сайту — на сторонні домени
// (НП, аналітика) вони не йдуть, навіть якщо ті відповідять 401.
import { SECRET_ENV_NAMES } from "../config/siteContract.config.mjs";

/** Логін і пароль basic-auth з env раннера; null — секретів немає (прод, локальний стенд). */
export function readBasicAuthCredentials() {
  const username = process.env[SECRET_ENV_NAMES.basicAuthUser];
  const password = process.env[SECRET_ENV_NAMES.basicAuthPassword];
  return username && password ? { username, password } : null;
}

/** Налаштування httpCredentials Playwright, обмежене origin сайту; undefined — секретів немає. */
export function buildSiteHttpCredentials(siteBaseUrl) {
  const basicAuthCredentials = readBasicAuthCredentials();
  if (!basicAuthCredentials) return undefined;
  return { ...basicAuthCredentials, origin: new URL(siteBaseUrl).origin };
}

/**
 * Додає заголовок Authorization до запитів на origin сайту — і лише до них.
 *
 * Потрібно для WebKit (06649): httpCredentials з обмеженням origin він не
 * надсилає, коли сайт на стандартному порту (https://site без номера порту), —
 * сторінка лишається «401 Authorization Required». Chromium надсилає. Зняти
 * обмеження origin не можна: тоді пароль пішов би будь-якому домену, що
 * відповів 401. Тому заголовок ставимо самі, перевіряючи origin кожного запиту.
 */
export async function sendBasicAuthToSiteOnly(browserContext, siteBaseUrl) {
  const basicAuthCredentials = readBasicAuthCredentials();
  if (!basicAuthCredentials) return;

  const siteOrigin = new URL(siteBaseUrl).origin;
  const { username, password } = basicAuthCredentials;
  const authorizationHeader = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

  await browserContext.route(
    (requestUrl) => requestUrl.origin === siteOrigin,
    (siteRequestRoute) =>
      siteRequestRoute.continue({
        headers: { ...siteRequestRoute.request().headers(), authorization: authorizationHeader },
      }),
  );
}
