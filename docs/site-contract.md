# Контракт сайта для site-ci-kit (06638 / 06639 / 06640 / 06641 / 07385)

Что репозиторий сайта обязан иметь, чтобы подключить общий CI, автовыкатку и
библиотеку smoke/E2E-тестов. Всё, что отличается между сайтами (команды,
URL, селекторы), живёт в репозитории сайта; общий код — здесь.

## 1. CI: области сайта (v3, 07385)

Сайт описывает свои области в ES-модуле `.github/site-ci-areas.config.mjs`
(input `areas-config`). **Без импортов**: CI читает файл через API GitHub, не
клонируя репозиторий. Пример — `examples/site-ci-areas.config.mjs`.

```js
export default {
  runEverythingPaths: [".github/**", "scripts/**"], // правка здесь — запускается всё
  ignoredPaths: ["docs/**", "**/*.md", "e2e/**"],     // правка здесь — ничего
  areas: {
    server: {
      paths: ["server/**"],
      install: "npm ci --prefix server",
      installKeyFiles: ["server/package-lock.json"],   // необязательно
      installedDirectories: ["server/node_modules"],   // необязательно
      checks: { lint: "…", unit: "…", integration: "…" },
    },
    client: {
      paths: ["client/**"],
      contentOnlyPaths: ["client/public/**"],          // необязательно
      contentOnlyChecks: ["lint", "build"],
      jsonFilePaths: ["client/public/locales/**/*.json"], // необязательно
      install: "npm ci --prefix client",
      checks: { lint: "…", unit: "…", build: "…" },
    },
  },
};
```

| Поле | Что значит |
|---|---|
| `areas.<имя>.paths` | шаблоны путей области (`**` — любая глубина, `*` — внутри имени). Путь может входить в несколько областей — тогда идут все |
| `install` | установка зависимостей области; выполняется в каждом джобе, где есть проверка этой области (одинаковая команда двух областей — один раз) |
| `installKeyFiles`, `installedDirectories` | на своём раннере `node_modules` остаются между запусками; если хэш `installKeyFiles` + команда + версия Node совпал с меткой в каждом из `installedDirectories` — установка пропускается |
| `checks.lint/unit/integration/build` | команды проверок; нет команды — у области нет такой проверки. В `lint` доступен `$LINT_BASE_REF` |
| `contentOnlyPaths` + `contentOnlyChecks` | если все изменённые файлы области — из `contentOnlyPaths` (тексты, картинки), идут только `contentOnlyChecks` |
| `jsonFilePaths` | изменённые файлы по этим шаблонам `lint` проверяет как строгий JSON |
| `runEverythingPaths` | правка здесь (сборка, CI) — все проверки всех областей |
| `ignoredPaths` | правка здесь не запускает ничего |

Файл, не попавший ни в одну область и ни в один список, запускает **всё**: новый
каталог не должен тихо остаться без проверок. Так же — если список изменённых
файлов неизвестен (новая ветка, больше 300 файлов в сравнении).

Джобы `lint`, `unit`, `integration`, `build` идут параллельно; джоб без работы
пропускается (`skipped`) — GitHub засчитывает его как пройденную обязательную
проверку. Имена проверок в PR: `<имя вызывающего джоба> / lint` и т.д. (при
джобе `ci` — `ci / lint`, `ci / unit`, `ci / integration`, `ci / build`).

**Отметка «дерево проверено».** После зелёных проверок джоб `record` ставит
статус `site-ci/tested-tree` (`tree <sha дерева> · <проверки>`) на голову PR
(или на коммит при push). Следующий прогон того же дерева — слияние PR,
PR develop → main, деплой — находит отметку и ничего не запускает. Поэтому деплой
сайта вызывает `ci.yml` с `checks: unit integration`: он проверяет только то,
что PR не покрыл (между проверкой и слиянием в ветку влили другой PR, прямой push).

Права вызывающего джоба: `contents: read, statuses: write, pull-requests: read`.

## 2. Smoke после деплоя и автовыкатка на прод

- После деплоя `develop` на stage сайт вызывает `smoke.yml` (`target-env: stage`).
  Тот ставит коммиту статус **`stage-smoke`**: `pending` в начале, в конце
  `success` / `failure` (тесты) или `error` (smoke не запустился) — и кладёт
  HTML-отчёт Playwright в артефакт `site-smoke-report-<env>`, ссылку — в сводку.
  С v3 это **сигнал, а не замок**: деплой прода его не ждёт (гейт
  `deploy-gate.yml` удалён). Красный smoke stage — алерт сайта.
- После деплоя на прод — `smoke.yml` с `target-env: prod`: только тесты с тегом
  `@prod-safe` (ничего не пишут: страницы, SEO, фильтр) и тестовый заказ
  `@test-order` (§5: сайт помечает его `isTest`, склад и статистика не меняются,
  в CRM он сразу отменяется).
- **Автовыкатка по метке** (`release-to-prod.yml`, необязательно). Деплой
  stage-ветки вызывает его после `checks`. Если коммит — слияние PR в develop
  и у PR метка `release-label` («в прод»), develop вливается в main
  merge-коммитом и запускается `deploy-workflow` на main (`workflow_dispatch`:
  слияние токеном GitHub Actions push-событий не порождает). Условия: в develop
  нет ни одного невыпущенного коммита, кроме коммитов этого PR, и нет
  конфликта. Иначе — комментарий в PR с причиной и красный джоб; прод не тронут.
  Прод-ветка не должна требовать PR или проверок для push: токен Actions их не
  обходит. Права: `contents: write, actions: write, pull-requests: write, issues: write`.
- Права вызывающих джобов `smoke.yml` — `contents: read, statuses: write`
  (и для prod: workflow объявляет `statuses: write`, без него вызов не стартует).
  Секреты в `smoke.yml` передаются явно: `secrets: inherit` не работает между
  разными владельцами (`pucha02/rosteria` → `keykey-team/site-ci-kit`).

Исключить тест из прогона можно через `grep`: значение подставляется внутрь
lookahead, поэтому `@smoke(?!.*@test-order)` берёт всё `@smoke`, кроме тестового
заказа (сайт без механизма §5 — Травниця).

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
    isCrmIntegrated: true, // необязательно: false — у сайта нет CRM, на проде проверяется лишь отмена на сайте (06968)
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
  Сайт без CRM отдаёт `crm: null` и ставит в конфиге `testOrder.isCrmIntegrated: false` (06968).
  На проде отдаются только тестовые заказы (остальные — 404), на stage — любые
  (smoke stage сверяет и обычный заказ гостя).
- `GET api.stockReadPath` → `{ sku, quantity }` — текущий остаток варианта на сайте.

**Выход покупателя отзывает токен на сервере**: после выхода
`GET api.customerProfilePath` со старым Bearer-токеном — 401/403 (smoke это
проверяет). Хранить отозванные токены достаточно до их естественного истечения
(TTL-индекс).

## 6. Регрессия каталога (необязательно, 06646)

Подробные сценарии каталога второго приоритета: тег `@regression`, только
stage (опираются на товары сида), в `@smoke` не входят. Сайт
подключает их, добавив блок `catalogScenario` в `site.config.mjs` и функции
ниже в `site.adapter.mjs`. Сайт без блока или без функций эти тесты
**пропускает** с пояснением в отчёте — остальное не меняется.

```js
// site.config.mjs
catalogScenario: {
  // Категория с тестовыми товарами сида.
  categoryPath: "/catalog/e2e-...",
  // Размер, который есть в наличии минимум у двух товаров категории с разной ценой.
  filteredSizeLabel: "41",
  // Что появляется в URL (после decodeURIComponent) при выборе этого размера и сортировки.
  filteredSizeUrlFragment: "attrs[size]=41_0",
  sortUrlFragments: { cheapestFirst: "sort=price_asc", mostExpensiveFirst: "sort=price_desc" },
  // Товар с двумя размерами разной цены и одним распроданным.
  variantProduct: {
    path: "/product/e2e-...",
    firstSize: { label: "42", priceUah: 1000 },
    secondSize: { label: "43", priceUah: 1200 },
    soldOutSizeLabel: "44",
  },
  // Адрес каталога, по которому товаров нет.
  emptyResultPath: "/catalog/e2e-...?attrs[size]=44_0",
},
```

| Функция адаптера | Что делает на сайте |
|---|---|
| `applyCatalogSizeFilter(page, sizeLabel)` | На открытой категории ставит фильтр по размеру с этой подписью. |
| `applyCatalogSort(page, sortOrder)` | Выбирает сортировку: `sortOrder` — `"cheapestFirst"` или `"mostExpensiveFirst"`. |
| `readListedProducts(page)` | **Возвращает** товары выдачи по порядку: `[{ name, priceUah }]`; пустая выдача — `[]`. |
| `openFirstListedProduct(page)` | Открывает первый товар выдачи и ждёт страницу товара. |
| `readSelectedSizeLabel(page)` | **Возвращает** подпись размера, выбранного на странице товара. |
| `chooseProductSize(page, sizeLabel)` | Выбирает размер на странице товара. |
| `readSelectedVariantOffer(page)` | **Возвращает** `{ priceUah, sku }` выбранного размера. |
| `readOfferedSizeLabels(page)` | **Возвращает** подписи размеров, которые сайт предлагает купить (распроданных среди них нет). |
| `expectCatalogEmptyState(page)` | Проверяет, что вместо товаров видно сообщение «ничего не найдено». |
| `resetCatalogFilters(page)` | Сбрасывает фильтры из этого сообщения. |

Запуск — отдельным вызовом `smoke.yml` со своим статусом коммита `stage-regression`
(отдельно от `stage-smoke`):

```yaml
regression-stage:
  needs: [seed-stage]
  uses: keykey-team/site-ci-kit/.github/workflows/smoke.yml@v2
  permissions: { contents: read, statuses: write }
  with:
    target-env: stage
    kit-ref: v2
    grep: "@regression"
    status-context: stage-regression
  secrets:
    E2E_BASIC_AUTH_USER: ${{ secrets.E2E_BASIC_AUTH_USER }}
    E2E_BASIC_AUTH_PASSWORD: ${{ secrets.E2E_BASIC_AUTH_PASSWORD }}
```

Отчёт Playwright такого вызова — артефакт `site-smoke-report-stage-stage-regression`.


## 7. Два варианта одного товара в корзине (необязательно, 06649)

Тест `cartVariants.spec.mjs`, тег `@regression`, только stage. Кладёт в корзину
два варианта одного товара и проверяет: позиций две, у каждой свой вариант,
название, фото и количество 1, а сумма корзины — сумма двух цен. Ловит
затирание первого варианта вторым и чужое фото в позиции.

```js
// site.config.mjs
cartVariantsScenario: {
  productPath: "/product/e2e-...",
  // Название товара — должно быть видно в каждой позиции корзины.
  productName: "E2E ...",
  // Необязательно: подпись цвета, которая должна быть видна в позиции (отдельным
  // полем или в названии). Нет — цвет не проверяется.
  colourLabel: "чорні",
  // Два варианта в наличии с РАЗНОЙ ценой: иначе сумма «дважды первый» совпала бы с верной.
  firstVariant: { optionLabel: "42", priceUah: 1000 },
  secondVariant: { optionLabel: "43", priceUah: 1200 },
},
```

| Функция адаптера | Что делает на сайте |
|---|---|
| `addProductVariantToCart(page, { productPath, optionLabel })` | Открывает товар, выбирает вариант, кладёт в корзину и оставляет её открытой. **Возвращает** `{ unitPrice, sku, photoUrl }`: цену и SKU варианта и адрес главного фото товара. |
| `readCartRows(page)` | (Корзина открыта) **возвращает** позиции: `[{ productName, optionLabel, photoUrl, quantity, rowText }]`; `rowText` — весь видимый текст позиции. |

`photoUrl` в обеих функциях — адрес фото в одном и том же виде (например, как
его хранит каталог, без обёртки оптимизатора картинок): тест сравнивает их
строкой. Фото тестового товара не должно совпадать с заглушкой, которой сайт
подменяет отсутствующее фото, — иначе проверка ничего не докажет.

## 8. Правки из админки на сайте (необязательно, 06649)

Тест `adminCatalogEdit.spec.mjs`, тег `@regression`, только stage; нужны секреты
админа и `E2E_TEST_ORDER_TOKEN`. Меняет в админке цену и остаток товара и
проверяет, что покупатель видит новые значения не позже чем через 60 секунд, а
товар с остатком 0 купить нельзя. В конце возвращает товар к состоянию сида.

```js
// site.config.mjs
adminCatalogEditScenario: {
  // ОТДЕЛЬНЫЙ товар сида: цену testProduct сверяет smoke, менять её нельзя.
  // Один вариант — тогда остаток 0 делает товар целиком недоступным.
  productPath: "/product/e2e-...",
  // Как адаптер находит товар в админке (ключ, id — что удобно сайту).
  adminProductKey: "e2e-...",
  optionLabel: "45",
  sku: "e2e-...",
  // Состояние сида и значения, на которые тест его меняет.
  seededOffer: { priceUah: 1000, stockQuantity: 5 },
  editedOffer: { priceUah: 1111, stockQuantity: 2 },
},
```

| Функция адаптера | Что делает на сайте |
|---|---|
| `editProductOfferInAdmin(page, { adminProductKey, optionLabel, priceUah, stockQuantity })` | (Админ уже вошёл — `loginAdmin`) открывает товар в админке, ставит варианту цену и остаток, сохраняет и дожидается подтверждения. Отказ админки — ошибка с её текстом. |
| `readStorefrontOffer(page, { productPath, optionLabel })` | Открывает страницу товара заново и **возвращает** `{ isPurchasable, priceUah }`: можно ли купить этот вариант и за сколько. Вариант не предлагается или кнопка покупки недоступна — `isPurchasable: false` (цена тогда не сверяется). |

Витрину тест смотрит отдельным браузерным контекстом без входа — как сторонний
покупатель, без кук админа. Остаток сверяется через `api.stockReadPath` (§5).
Тест требователен ко времени: предел 60 с задан в
`e2e/config/regressionScenarios.config.mjs`, фактическое время — в аннотации отчёта.

## 9. Путь заказа на телефоне (необязательно, 06649)

Тест `mobileCheckout.spec.mjs`, теги `@regression @mobile`, только stage. Идёт в
проекте `mobile-webkit` (профиль iPhone 14, движок WebKit): каталог → товар →
корзина → оформление → подтверждение. На каждом шаге страница не должна быть
шире экрана; кнопки нажимаются по-настоящему — перекрытую или ушедшую за экран
кнопку Playwright не нажмёт. Заказ — обычный заказ гостя, как в smoke.

```js
// site.config.mjs
mobileCheckoutScenario: {
  categoryPath: "/catalog/e2e-...",
  // Товар, который тест находит в выдаче по названию, и вариант в наличии.
  productName: "E2E ...",
  optionLabel: "42",
},
```

| Функция адаптера | Что делает на сайте |
|---|---|
| `openListedProductByName(page, productName)` | На открытой категории открывает карточку товара с этим названием и ждёт страницу товара. |
| `addOpenedProductToCart(page, { optionLabel })` | На открытой странице товара выбирает вариант и кладёт в корзину. **Возвращает** `{ unitPrice, sku }`. |

Остальные шаги — обязательные функции §3 (`openCheckout`, `fillGuestBuyer`,
`chooseNovaPoshtaBranch`, `chooseOfflinePayment`, `submitOrder`,
`expectOrderPlaced`, `readPlacedOrderNumber`): на мобильной вёрстке они должны
работать так же, как на десктопной. В вызове `smoke.yml` нужен
`browsers: chromium webkit` — иначе WebKit не установлен и тест упадёт на запуске.

## 10. Онлайн-оплата со скидкой (необязательно, 06649)

Тест `onlinePayment.spec.mjs`, тег `@regression`, только stage; нужны секреты
покупателя и `E2E_TEST_ORDER_TOKEN`. Тестовый покупатель со скидкой оформляет
заказ с оплатой картой, платит вымышленной картой на тестовой странице банка и
возвращается на сайт. Проверяется: скидка больше нуля; «к оплате» = цена − скидка;
счёт банка — на ту же сумму; заказ в базе оплачен, сумма и скидка те же; та же
сумма — на странице «спасибо».

**Условие на стороне сайта:** stage работает с **тестовым** токеном банка
(monobank) или передаёт LiqPay параметр `sandbox`, а адреса возврата и вебхука,
которые сайт отдаёт банку, ведут на stage, а не на прод. LiqPay без своего
`server_url` в платеже шлёт вебхук на адрес из кабинета магазина — то есть на
прод; статус `sandbox` прод не должен считать оплатой. Передачу оплаты в CRM тест не проверяет: stage заказов в CRM не шлёт (§4).

```js
// site.config.mjs
onlinePaymentScenario: {
  // Чью тестовую страницу оплаты проходить: "monobank" или "liqpay" (с v2.6.0); "site" (v3.3.0) —
  // тестовой страницы банка нет, шаги «банка» выполняет адаптер сайта (функции ниже).
  paymentProvider: "monobank",
  // Необязательно (v3.3.0): false — форма оформления не подставляет данные вошедшего покупателя;
  // тест заполняет её сам (fillGuestBuyer + chooseNovaPoshtaBranch) вместо expectCheckoutAutofilled.
  isCheckoutAutofilled: true,
  // Необязательно: точный размер скидки, если он не зависит от настроек магазина.
  // Без поля тест требует только, чтобы скидка была больше нуля.
  expectedDiscountUah: 50,
  // Свои поля для applyCheckoutDiscount — например, promoCode сайта с промокодами.
},
```

| Функция адаптера | Что делает на сайте |
|---|---|
| `applyCheckoutDiscount(page, onlinePaymentScenario)` | На оформлении применяет скидку покупателя (вводит промокод; где скидка применяется сама — ничего не вводит) и **возвращает** её размер, грн. |
| `readCheckoutTotalToPay(page)` | **Возвращает** сумму к оплате на оформлении после скидки, грн. |
| `chooseOnlineCardPayment(page)` | Выбирает оплату картой онлайн. |
| `submitOrderForOnlinePayment(page)` | Отправляет форму и ждёт, пока сайт уведёт на страницу банка; отказ сайта — ошибка с его текстом. Саму страницу банка проходит библиотека. |
| `readThankYouOrderTotal(page)` | **Возвращает** сумму заказа со страницы «спасибо», грн. Если страница сумму не показывает — сумму покупки, которую она передаёт в аналитику. |

Провайдер `"site"` (v3.3.0, Power Pro — тестового мерчанта AssetPayments нет): страницу банка
заменяют четыре функции адаптера. Без любой из них тест пропускается.

| Функция адаптера | Что делает |
|---|---|
| `expectSitePaymentPage(page)` | Сайт отправил покупателя в банк (например, форма оплаты собрана и перехвачена до банка). |
| `readSitePaymentAmountUah(page)` | **Возвращает** сумму счёта, которую сайт передал банку, грн. |
| `paySitePaymentAsBank(page)` | Сообщает сайту об успешной оплате так, как это делает банк (запрос на вебхук оплаты stage). |
| `returnFromSitePayment(page)` | Возвращает покупателя на сайт — на страницу, куда банк ведёт после оплаты. |

Покупатель теста — тестовый покупатель сида (§4): сид даёт ему скидку (бонусы
или промокод). `GET api.testOrderReadPath` (§5) для этого сценария дополнительно
отдаёт блок оплаты:

```
payment: { isPaid, totalToPayAmount, discountAmount }
```

`isPaid` — заказ оплачен полностью (сайт принял подтверждение банка);
`totalToPayAmount` — сколько покупатель должен был заплатить; `discountAmount` —
сколько снято скидкой. Подтверждение банка приходит на сайт отдельным запросом,
поэтому тест ждёт `isPaid` до 60 с.

## 11. Заказ с доставкой Укрпоштой (необязательно, 06967)

Тест `ukrposhtaCheckout.spec.mjs`, тег **`@smoke`** (входит в smoke stage), только
stage: тот же путь гостя, что §3 с Новой почтой, но отделение Укрпошты; заказ
сверяется в базе через `api.testOrderReadPath` (§5). Сайт без блока
`ukrposhtaCheckoutScenario` или без функции адаптера тест **пропускает**.

```js
// site.config.mjs
ukrposhtaCheckoutScenario: {
  cityName: "Київ",
  // Остальные поля — какие нужны адаптеру сайта (область, индекс, отделение…).
  // Необязательно: каким сайт хранит способ доставки; тогда API заказа (§5)
  // отдаёт поле deliveryMethod и тест его сверяет.
  storedDeliveryMethod: "ukrposhta",
},
```

| Функция адаптера | Что делает на сайте |
|---|---|
| `chooseUkrposhtaBranch(page, ukrposhtaCheckoutScenario)` | На форме заказа выбирает доставку Укрпоштой, город и отделение. Ответы API Укрпошты сайт может подменить в браузере (`page.route`), чтобы smoke не падал от сбоя перевозчика. |

Остальные шаги — обязательные функции §3.

## 12. Тестовые заказы с другими способами доставки (необязательно, 07427)

Тест `deliveryOptionsCheckout.spec.mjs`, тег **`@smoke`**, только stage: путь
тестового заказа (§5) — корзина, данные покупателя, оплата без банка, — но
вместо отделения Новой почты способ из списка `deliveryOptions`. Отдельный тест
на каждый способ: в отчёте видно, какой сломался. Заказ уходит с заголовком
`X-Test-Order-Token`, поэтому остаток stage не меняется и менеджерам он не
приходит; в базе сверяются `isTest`, сумма, товар и — если задан
`storedDeliveryMethod` — поле `deliveryMethod` ответа API заказа (§5).
Сайт без блока или без функции адаптера тест **пропускает**.

```js
// site.config.mjs
deliveryOptionsCheckoutScenario: {
  deliveryOptions: [
    // title — имя теста в отчёте; остальные поля — какие нужны адаптеру сайта.
    {
      title: "поштомат Нової пошти",
      deliveryType: "postomat",
      storedDeliveryMethod: "postomat",
      // Необязательно: поля поверх novaPoshta (§3) для подмены справочника НП
      // в этом тесте — например, поштомат вместо отделения.
      novaPoshta: {
        warehouseName: 'Поштомат "Нова Пошта" №1001: вул. Сім\'ї Кульженків, 31а',
        warehouseRef: "8e00619f-76b4-11eb-ac16-b8830365bd14",
        warehouseNumber: "1001",
        warehouseTypeRef: "f9316480-5f2d-425d-bc2c-ac7cd29decf0",
      },
    },
    { title: "кур'єр Нової пошти", deliveryType: "courier", courierAddress: "вул. Тестова, 1", storedDeliveryMethod: "courier" },
  ],
},
```

| Функция адаптера | Что делает на сайте |
|---|---|
| `chooseDeliveryOption(page, deliveryOption)` | На форме заказа выбирает способ доставки из `deliveryOptions` и заполняет его поля (город, поштомат, адрес курьера…). |

Остальные шаги — обязательные функции §3.

## 13. Заказ из личного кабинета (необязательно, 07427)

Тест `customerAccountOrder.spec.mjs`, тег **`@smoke`**, только stage. Для сайтов,
где покупатель заказывает **в самом кабинете** (оптовая форма, повтор заказа), а
не через форму витрины: контакты заказа сайт берёт из профиля, и заказ
появляется в истории кабинета. Если кабинет лишь подставляет данные в форму
витрины — это §3, `authorizedCheckout.spec.mjs`. Покупатель — из секретов
`E2E_CUSTOMER_*` (тестовый покупатель сида). Сайт без блока или без функций
адаптера тест **пропускает**.

```js
// site.config.mjs
customerAccountOrderScenario: {
  // Товар, который покупатель заказывает в кабинете; остальные поля — для адаптера.
  productName: "ТЕСТ Протеїн Whey полуниця",
},
```

| Функция адаптера | Что делает на сайте |
|---|---|
| `placeOrderFromCustomerAccount(page, customerAccountOrderScenario)` | Вошедший покупатель заказывает товар в кабинете. Возвращает `{ orderNumber }`. |
| `expectAccountOrderContactsFromProfile(page, orderNumber)` | Имя, фамилия и телефон в заказе совпадают с профилем покупателя. |
| `expectOrderInCustomerAccount(page, orderNumber)` | Заказ виден в истории кабинета (та же функция, что в §3). |
