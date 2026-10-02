# Контракт сайта для site-ci-kit (06638 / 06639 / 06640 / 06641)

Что репозиторий сайта обязан иметь, чтобы подключить общий CI, гейт деплоя и
библиотеку smoke/E2E-тестов. Всё, что отличается между сайтами (команды,
URL, селекторы), живёт в репозитории сайта; общий код — здесь.

## 1. CI: команды сайта

Сайт отдаёт команды, шаблон `ci.yml` их только запускает (inputs):

| Input | Пример (Sana) | Что делает |
|---|---|---|
| `lint-command` | `npm run lint:changed --prefix server && npm run lint:changed --prefix client` | Линтер. Должен проходить на текущем коде: если в проекте накоплен долг, проверяются только файлы, изменённые относительно базовой ветки (`LINT_BASE_REF` в env). |
| `unit-command` | `npm run test:unit --prefix server` | Тесты без БД и сети. |
| `integration-command` | `npm run test:integration --prefix server` | Тесты с mongodb-memory-server / supertest. |
| `install-command` | `npm ci --prefix server` | Установка зависимостей для трёх джобов. |

Необязательные inputs: `node-version` (по умолчанию `22`), `cache-dependency-path`
(lock-файлы для кэша npm, по умолчанию `**/package-lock.json`), `timeout-minutes`
(по умолчанию 10), `runner-labels` (JSON-метки раннера, по умолчанию
`["ubuntu-latest"]`; для сайта без минут GitHub-hosted — например
`["self-hosted","rosteria"]`; есть и у `smoke.yml`, и у `deploy-gate.yml`).

Три джоба `lint`, `unit`, `integration` идут параллельно, у каждого
`timeout-minutes` ≤ 10. Имена проверок в PR: `<имя вызывающего джоба> / lint` и т.д.
(при джобе `ci`, как в `examples/caller-workflows/ci.yml`, — `ci / lint`,
`ci / unit`, `ci / integration`) — их и делают обязательными в правилах ветки `develop`.

## 2. Smoke после деплоя на stage и гейт прода

- После деплоя `develop` на stage сайт вызывает `smoke.yml` (`target-env: stage`).
  Тот ставит коммиту статус **`stage-smoke`**: `pending` в начале, в конце
  `success` / `failure` (тесты) или `error` (smoke не запустился: установка,
  неполный конфиг сайта) — и кладёт HTML-отчёт Playwright в артефакт
  `site-smoke-report-<env>`, ссылку — в сводку запуска.
- Деплой `main` на прод сначала вызывает `deploy-gate.yml`: он ищет коммит,
  который проверялся на stage (для merge-коммита develop→main — второй
  родитель, иначе сам коммит), и пропускает деплой только при `stage-smoke = success`.
  Поэтому develop вливается в main **merge-коммитом** (не squash/rebase: у
  нового коммита статуса нет). Ручной обход — `workflow_dispatch` с непустым
  `gate-override-reason` (причина и автор пишутся в сводку).
- После деплоя на прод — `smoke.yml` с `target-env: prod`: только тесты с тегом
  `@prod-safe` (ничего не пишут: страницы, SEO, фильтр) и тестовый заказ
  `@test-order` (§5: сайт помечает его `isTest`, склад и статистика не меняются,
  в CRM он сразу отменяется).
- Права вызывающих джобов: `smoke.yml` — `contents: read, statuses: write`
  (и для prod: workflow объявляет `statuses: write`, без него вызов не стартует);
  `deploy-gate.yml` — `contents: read, statuses: read`. Секреты в `smoke.yml`
  передаются явно: `secrets: inherit` не работает между разными владельцами
  (`pucha02/rosteria` → `keykey-team/site-ci-kit`).

Теги тестов: `@smoke` — входит в smoke (по умолчанию `grep`), `@prod-safe` —
не пишет данных, можно на проде, `@test-order` — пишет только тестовый заказ
(§5), тоже можно на проде. На проде без одного из этих двух тегов тест не
запустится даже при другом `grep` (фильтр в конфиге библиотеки + фикстура).

## 3. Каталог `e2e/` в репозитории сайта

```
e2e/
  site.config.mjs    # данные сайта: URL, страницы, тестовый товар, фильтр, доставка
  site.adapter.mjs   # как на ЭТОМ сайте сделать шаг сценария (селекторы)
```

### `site.config.mjs` (default export)

```js
export default {
  siteKey: "sana",
  baseUrls: { stage: "https://dev.sanashoes.com.ua", prod: "https://sanashoes.com.ua" },
  // Ключевые страницы для проверки доступности (8): путь + селектор «страница готова».
  keyPages: {
    home: { path: "/", readySelector: "main" },
    category: { path: "/catalog/all", readySelector: "..." },
    product: { path: "/product/e2e-...", readySelector: "..." },
    search: { path: "/catalog/search/...", readySelector: "..." },
  },
  // Фильтр категории: URL до фильтра, ожидаемый параметр в URL после.
  categoryFilter: { categoryPath: "/catalog/all", expectedUrlParam: "attrs[rozmir]" },
  // Товар из сида (06639), который тест кладёт в корзину.
  testProduct: { path: "/product/e2e-...", optionLabel: "42" },
  // Новая почта: реальные Ref (сервер их проверяет), ответы API НП в браузере
  // подменяются фикстурами — smoke не падает от сбоя НП.
  novaPoshta: { cityName: "Київ", cityRef: "...", warehouseName: "...", warehouseRef: "..." },
  // Требования к SEO на проде.
  seo: { sitemapPath: "/sitemap.xml", robotsPath: "/robots.txt", indexedPaths: ["/", "/catalog/all"] },
  // API сайта для проверок без браузера (§5); {orderNumber} и {sku} подставляет библиотека.
  api: {
    customerProfilePath: "/api/iam/auth/me",
    testOrderReadPath: "/api/iam/e2e/orders/{orderNumber}",
    stockReadPath: "/api/catalog/e2e/stock/{sku}",
  },
  // Тестовый заказ на проде (§5): настоящий товар в наличии; на stage берётся testProduct.
  testOrder: {
    createOrderUrlPattern: "**/api/iam/guest-checkout",
    product: { path: "/product/...", optionLabel: null },
    blockedRequestPatterns: [], // необязательно: свои счётчики аналитики сверх типовых
  },
  // Необязательно: известный шум консоли (regex-строки), который сайт пока не исправил.
  // Массив — для всех окружений, объект { stage: [...], prod: [...] } — по окружениям.
  consoleErrorIgnorePatterns: [],
};
```

Уточнения к полям (библиотека проверяет обязательные до запуска и называет
незаполненные):

- `keyPages` — обязательны `home`, `category`, `product`, `search`, у каждой
  `path` и `readySelector`; можно добавить свои. Ждётся первый **видимый**
  элемент по селектору (адаптивная вёрстка часто держит скрытую копию блока).
- `categoryFilter` — библиотека сама открывает `categoryPath`, адаптер только
  ставит фильтр; `expectedUrlParam` ищется в декодированном URL.
- `testProduct.optionLabel` — необязателен (товар без вариантов); `null` у
  `testOrder.product.optionLabel` — адаптер берёт первый доступный вариант
  (размеры на проде раскупают).
- Консоль браузера на `keyPages` должна быть чистой: считаются необработанные
  исключения страницы и `console.error` скриптов самого сайта; ошибки сторонних
  скриптов (пиксели, виджеты) не считаются. `consoleErrorIgnorePatterns` — только
  для известного шума с задачей на исправление. Шум, который есть лишь на stage
  (устаревшая копия базы: удалённые фото дают 403 в `/_next/image`), задаётся
  объектом `{ stage: [...] }` — на проде та же ошибка остаётся настоящей.
- `novaPoshta` — необязательные поля: `areaName` + `areaRef` (нужны, если сайт
  сначала спрашивает область, как Sana — `getAreas`), `warehouseNumber`,
  `warehouseTypeRef` (по умолчанию «Поштове відділення»), `settlementRef`.
  Подменяются методы `getAreas`, `getCities`, `getSettlements`,
  `searchSettlements`, `getWarehouses`, `getWarehouseTypes`; на другие подмена
  отвечает `success:false` с названием метода.

Секреты — только из env раннера (никогда в конфиге):
`E2E_BASIC_AUTH_USER`, `E2E_BASIC_AUTH_PASSWORD` (basic-auth stage),
`E2E_CUSTOMER_PHONE`, `E2E_CUSTOMER_OTP_CODE` (тестовый покупатель, §4),
`E2E_ADMIN_LOGIN`, `E2E_ADMIN_PASSWORD` (тестовый админ из сида),
`E2E_TEST_ORDER_TOKEN` (`TEST_ORDER_TOKEN` сервера этого окружения, §5).
Нет секрета — тест, которому он нужен, **пропускается** с причиной в отчёте
(не падает). Basic-auth отправляется только на домен сайта.

### `site.adapter.mjs` (named exports, все async, первый аргумент — Playwright `page`)

| Функция | Что делает на сайте |
|---|---|
| `addTestProductToCart(page, siteConfig)` | Открывает `testProduct`, выбирает опцию (`null` — первую доступную), кладёт в корзину. **Возвращает** `{ unitPrice, sku }`: цену выбранного варианта с карточки (число, грн) и SKU варианта в корзине. |
| `readCartTotal(page)` | Сумма товаров в корзине / на оформлении без доставки (число, грн). |
| `openCheckout(page)` | Открывает форму заказа с корзиной. |
| `fillGuestBuyer(page, buyer)` | ФИО, телефон, email гостя (`buyer` — фейковые данные из библиотеки). |
| `chooseNovaPoshtaBranch(page, novaPoshta)` | Выбирает город и отделение НП. |
| `chooseOfflinePayment(page)` | Способ оплаты без перехода в банк (Sana — `iban`, Rosteria — `cash`). |
| `submitOrder(page)` | Отправляет форму. |
| `expectOrderPlaced(page)` | Проверяет страницу «спасибо» / подтверждение. |
| `readPlacedOrderNumber(page)` | Номер только что оформленного заказа (строка). |
| `expectOrderInCustomerAccount(page, orderNumber)` | Открывает историю заказов в кабинете, заказ там есть. |
| `readCustomerSessionToken(page)` | Bearer-токен вошедшего покупателя (обычно кука) — библиотека проверяет, что после выхода API его отклоняет. |
| `loginCustomer(page, { phone, otpCode })` | Вход по телефону и коду. |
| `expectCustomerLoggedIn(page)` / `logoutCustomer(page)` / `expectCustomerLoggedOut(page)` | |
| `expectCheckoutAutofilled(page)` | В форме заказа предзаполнены имя, телефон, доставка тестового покупателя. |
| `loginAdmin(page, { login, password })` / `expectAdminPanel(page)` | Вход в админку и видимая панель. |
| `expectAdminOrdersList(page)` | (Админ уже вошёл) открывает список заказов, он загрузился без ошибки. |
| `applyCategoryFilter(page, siteConfig)` | Ставит фильтр на уже открытой странице категории. |
| `readListedProductCount(page)` | Сколько товаров в выдаче (для проверки «фильтр вернул товары»; библиотека опрашивает, пока не станет > 0). |

Все функции обязательны: библиотека до запуска проверяет экспорт и называет
недостающие. Шаг, который сайт пока не умеет, может бросать понятную ошибку
(шаблон — `examples/site-e2e/site.adapter.mjs`).

Аргументы: `buyer` — `{ firstName, middleName, lastName, fullName,
phoneInternational (+380…), phoneNational (0…), email (@example.com), orderComment }`;
`novaPoshta` — объект из `site.config.mjs`; учётные данные — из секретов.

Импортировать в `site.config.mjs` / `site.adapter.mjs` можно только
`@playwright/test` и встроенные модули Node: их резолвит библиотека
(в репозитории сайта ставить Playwright не нужно — две копии в одном процессе
он не допускает).

## 4. Стенд stage (код сайта, 06639)

| Env (только stage) | Значение | Зачем |
|---|---|---|
| `ORDER_DISPATCH_ENABLED=0` | по умолчанию включено (прод не меняется) | Заказы stage не уходят в CRM, Telegram и CAPI (Meta/TikTok) — E2E не мусорит в боевых системах. |
| `E2E_TEST_LOGIN_ENABLED=1`, `E2E_CUSTOMER_PHONE`, `E2E_CUSTOMER_OTP_CODE` | выключено по умолчанию | Для одного тестового номера код подтверждения — из env, SMS не шлётся. **На проде не работает никогда**: код проверяет окружение (`SENTRY_ENVIRONMENT=production` → выключено) и это покрыто тестом. |

Сид: `npm run seed:stage` и `npm run seed:reset` (в `server/`):
- создают/возвращают в исходное состояние только помеченные тестовые данные
  (ключи/slug/sku с префиксом `e2e-`), удаляют заказы тестового покупателя;
  остальную базу stage не трогают;
- отказываются работать, если база не stage (имя БД сверяется со списком stage-баз);
- данные вымышленные (без реальных людей), покупатель — `E2E_CUSTOMER_PHONE`;
- состав: вариации цвет × размер (или аналог сайта), остаток 0 и 1, архивный
  товар (все варианты недоступны), цена 0, скрытый товар, промокоды всех типов
  сайта (если есть), тестовый покупатель с адресом доставки, тестовый админ.

## 5. Тестовый заказ и API для проверок (код сайта, 06641)

Сервер сайта (прод и stage) принимает **тестовый заказ** и отдаёт данные для
проверок smoke. Всё закрыто одним секретом окружения `TEST_ORDER_TOKEN`
(случайная строка ≥ 32 символов, у прода и stage — разные); в CI он приходит
как `E2E_TEST_ORDER_TOKEN` (секреты репозитория `E2E_STAGE_TEST_ORDER_TOKEN`,
`E2E_PROD_TEST_ORDER_TOKEN`).

**Оформление с заголовком `X-Test-Order-Token`** (библиотека добавляет его
только к запросу `testOrder.createOrderUrlPattern`):

- нет заголовка — обычный заказ, поведение не меняется;
- заголовок есть, но не совпадает (сравнение `timingSafeEqual`) или
  `TEST_ORDER_TOKEN` на сервере не задан — **403**, ничего не создаётся и не
  резервируется: тест не может превратиться в настоящий заказ;
- совпал — заказ сохраняется с `isTest: true` (флаг только из заголовка, не из
  тела), только с оплатой без банка. Тестовый заказ:
  - не резервирует и не списывает остаток, не пишет журнал движения склада;
  - не списывает и не начисляет бонусы/кешбэк/реферальные, не трогает промокоды;
  - не попадает в бизнес-метрики (`shop_orders_*`), аналитику продаж, карточки
    клиентов; не привязывается к покупателю по телефону;
  - не шлёт Telegram и CAPI (Meta/TikTok); страница «спасибо» не шлёт purchase;
  - в CRM (если `ORDER_DISPATCH_ENABLED` не выключен) уходит **без товарных
    позиций** (склад и резерв CRM не двигаются), с пометкой «🧪 ТЕСТОВЕ
    ЗАМОВЛЕННЯ» в комментариях, клиентом «ТЕСТ Автоперевірка» **без телефона**
    (ничей номер +380100000001 Sitniks отвергает — `client.phone_must_be_valid`,
    а настоящий мог бы принадлежать живому клиенту) и кастомным полем
    `test_order` (его заводят в CRM заранее; Sitniks сам делает из названия код
    `testorder` и сопоставляет поле по коду — в конфиге сайта нужен именно он,
    сверить через `GET /open-api/custom-fields`); товар и SKU — текстом в комментарии;
  - сразу после создания отменяется в CRM (`PUT /orders/{id}/status`) и на сайте;
    сбой отмены — алерт через обычный канал сбоев интеграций;
  - виден в админском списке заказов с пометкой «ТЕСТ».

**Чтение для проверок** (тот же заголовок; нет `TEST_ORDER_TOKEN` — 404,
не совпал — 403; без персональных данных):

- `GET api.testOrderReadPath` →
  `{ orderNumber, isTest, isCancelled, itemsTotalAmount, items: [{ sku, quantity, unitPrice }], crm: { orderId, isCancelled } }`.
  На проде отдаются только тестовые заказы (остальные — 404), на stage — любые
  (smoke stage сверяет и обычный заказ гостя).
- `GET api.stockReadPath` → `{ sku, quantity }` — текущий остаток варианта на сайте.

**Выход покупателя отзывает токен на сервере**: после выхода
`GET api.customerProfilePath` со старым Bearer-токеном — 401/403 (smoke это
проверяет). Хранить отозванные токены достаточно до их естественного истечения
(TTL-индекс).
