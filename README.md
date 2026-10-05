# site-ci-kit

Общий CI, гейт деплоя и библиотека smoke/E2E-тестов для сайтов агентства
(задачи 06638, 06640 и 06641). Сайт подключается ссылкой на reusable workflow и двумя
файлами в своём репозитории — общий код живёт здесь.

Репозиторий **публичный**: здесь нет секретов, адресов админок и данных сайтов.
Всё, что отличается между сайтами (команды, URL, селекторы, тестовые данные),
лежит в репозитории сайта, секреты — в его GitHub Secrets.

## Как устроено

```
push / PR ──► ci.yml: lint │ unit │ integration (параллельно, ≤ 10 мин)
                 └─► обязательные проверки ветки develop: PR с красной проверкой не влить

push develop ──► деплой stage ──► smoke.yml (stage) ──► статус коммита stage-smoke
push main ─────► deploy-gate.yml: stage-smoke влитого коммита = success?
                     ├─ нет ──► деплой прода не начинается (ручной обход — с причиной)
                     └─ да ───► деплой прода ──► smoke.yml (prod, только @prod-safe)
```

| Что | Где |
|---|---|
| CI: lint, unit, integration | `.github/workflows/ci.yml` |
| Smoke/E2E после деплоя, статус `stage-smoke`, HTML-отчёт | `.github/workflows/smoke.yml` |
| Гейт прода по `stage-smoke` | `.github/workflows/deploy-gate.yml` |
| Сценарии Playwright (общие для всех сайтов) | `e2e/tests/` |
| Загрузка и проверка конфига/адаптера сайта, фикстуры, подмена API Новой почты, фейковый покупатель | `e2e/lib/` |
| Правила запуска: таймауты, теги, повторы, пути отчёта | `e2e/config/*.config.mjs` |
| Что сайт обязан предоставить | `docs/site-contract.md` |
| Шаблоны для сайта | `examples/site-e2e/`, `examples/caller-workflows/` |

## Подключение нового сайта

Всё делается в репозитории сайта; в этом репозитории ничего менять не нужно.

### 1. Каталог `e2e/`

1. Скопируйте `examples/site-e2e/site.config.mjs` и `site.adapter.mjs` в `e2e/`
   репозитория сайта.
2. В `site.config.mjs` замените все `TODO`: адреса stage/прода, ключевые
   страницы с селектором «страница готова», фильтр категории, тестовый товар
   из сида stage, реальные Ref города и отделения Новой почты, SEO-страницы.
3. В `site.adapter.mjs` реализуйте каждую функцию селекторами сайта. Импортировать
   можно только `@playwright/test` и модули Node; ставить Playwright в репозиторий
   сайта не нужно. Нереализованная функция бросает понятную ошибку — тест,
   который её вызывает, будет красным с её названием.
4. Проверьте локально (раздел «Локальный запуск»).

Формат и смысл каждого поля — `docs/site-contract.md` §3. Стенд stage (флаги
`ORDER_DISPATCH_ENABLED=0`, `E2E_TEST_LOGIN_ENABLED`, сид) — §4.

### 2. CI на push и PR

Скопируйте `examples/caller-workflows/ci.yml` в `.github/workflows/ci.yml` сайта
и укажите свои команды:

| Input | Обязателен | По умолчанию | Что это |
|---|---|---|---|
| `install-command` | да | — | установка зависимостей (в каждом из трёх джобов) |
| `lint-command` | да | — | линтер; база для «только изменённые файлы» — `$LINT_BASE_REF` |
| `unit-command` | да | — | тесты без БД и сети |
| `integration-command` | да | — | тесты с mongodb-memory-server / supertest |
| `node-version` | нет | `22` | версия Node |
| `cache-dependency-path` | нет | `**/package-lock.json` | lock-файлы для кэша npm |
| `timeout-minutes` | нет | `10` | предел каждого джоба (джобы параллельны) |
| `runner-labels` | нет | `["ubuntu-latest"]` | JSON-метки раннера; `["self-hosted","rosteria"]`, если у владельца кончились минуты GitHub-hosted |

`LINT_BASE_REF`: в PR — `origin/<базовая ветка>`, на push — коммит до push
(для новой ветки или после force-push — `HEAD~1`). Бинарники MongoDB для
integration кэшируются (`~/.cache/mongodb-binaries`), в lint и unit их загрузка
отключена.

### 3. Smoke и гейт в деплое

Возьмите из `examples/caller-workflows/deploy.yml` три джоба и встройте в свой
`deploy.yml`, не трогая сборку и сам деплой:

- `deploy-gate` — только для `main`, перед деплоем; `permissions: contents: read, statuses: read`;
- `smoke-stage` — после деплоя `develop`, `target-env: stage`;
- `smoke-prod` — после деплоя `main`, `target-env: prod`.

Обоим smoke нужны `permissions: contents: read, statuses: write` (workflow
объявляет `statuses: write`, без этого GitHub не запустит вызов даже для прода).
Секреты передаются **явно** (`secrets: inherit` не работает между разными
владельцами, например `pucha02/rosteria` → `keykey-team/site-ci-kit`).

Inputs `smoke.yml`: `target-env` (обязателен), `site-e2e-dir` (`e2e`),
`kit-ref` (`v2` — держите равным версии в `uses: ...@v2`), `grep` (`@smoke`),
`status-context` (`stage-smoke`), `runner-labels`.
Inputs `deploy-gate.yml`: `status-context` (`stage-smoke`), `override-reason` (`""`),
`runner-labels`.

Добавьте в `on.workflow_dispatch.inputs` деплоя `gate-override-reason`
(как в примере) — это ручной обход гейта.

### 4. Секреты (Settings → Secrets and variables → Actions → New repository secret)

| Секрет | Для чего | Если нет |
|---|---|---|
| `E2E_BASIC_AUTH_USER`, `E2E_BASIC_AUTH_PASSWORD` | basic-auth stage | stage ответит 401 — smoke красный |
| `E2E_CUSTOMER_PHONE`, `E2E_CUSTOMER_OTP_CODE` | тестовый покупатель из сида stage (вход по коду без SMS) | вход/выход и заказ с автозаполнением **пропускаются** |
| `E2E_ADMIN_LOGIN`, `E2E_ADMIN_PASSWORD` | тестовый админ из сида stage | проверка админки **пропускается** |
| `E2E_STAGE_TEST_ORDER_TOKEN`, `E2E_PROD_TEST_ORDER_TOKEN` | `TEST_ORDER_TOKEN` сервера stage / прода (`docs/site-contract.md` §5): тестовый заказ и чтение заказа/остатка через API. В `smoke.yml` передаётся как `E2E_TEST_ORDER_TOKEN` | тестовый заказ и заказ гостя **пропускаются** |

Пропущенные тесты и причина видны в сводке запуска. Basic-auth отправляется
только на домен сайта. На прод передаётся только `E2E_TEST_ORDER_TOKEN` прода.

### 5. Разрешить вызов workflow из этого репозитория

Settings → Actions → General → Actions permissions. Если выбрано не «Allow all
actions and reusable workflows», добавьте в список разрешённых
`keykey-team/site-ci-kit/.github/workflows/*@*` (и `actions/*`, если ограничены
и они). В «Workflow permissions» достаточно «Read repository contents» — нужные
права джобы просят сами.

### 6. Правила веток (делает владелец репозитория)

Обязательные проверки появляются в списке выбора только после того, как
хотя бы раз отработали в репозитории — сначала запушьте `ci.yml` и откройте
любой PR.

**develop** — Settings → Rules → Rulesets → New ruleset → New branch ruleset:

1. Ruleset name: `develop`; Enforcement status: **Active**.
2. Target branches → Add target → Include by pattern → `develop`.
3. Отметить: **Restrict deletions**, **Block force pushes**,
   **Require a pull request before merging**,
   **Require status checks to pass** → Add checks → `ci / lint`, `ci / unit`,
   `ci / integration` (источник — GitHub Actions).
4. Bypass list — пусто (или только владелец, для аварий).
5. Create.

То же через классические правила: Settings → Branches → Add branch protection
rule → Branch name pattern `develop` → Require a pull request before merging +
Require status checks to pass before merging → найти и отметить три проверки.

**main** — такой же ruleset с паттерном `main`. По желанию в Require status
checks добавьте `stage-smoke`: тогда PR develop → main нельзя влить, пока smoke
на stage не зелёный (раньше, чем сработает гейт деплоя). Hotfix-PR прямо в main
при этом тоже ждут `stage-smoke` — проводите их через stage или обходите
правилом из Bypass list.

> Правила веток в **приватном** репозитории работают только на платных планах
> (GitHub Team для организации, GitHub Pro для личного аккаунта). На Free GitHub
> покажет «Not enforced» — проверки будут, но кнопку Merge они не заблокируют.

### 7. Проверить, что всё работает

1. PR в develop с ошибкой линта → проверка `ci / lint` красная, Merge недоступен.
2. Push в develop → после деплоя в запуске Deploy есть джоб `smoke-stage / smoke (stage)`,
   в его сводке — счётчики и ссылка на отчёт, на коммите — статус `stage-smoke`.
3. Merge develop → main → джоб `deploy-gate / stage-smoke gate` зелёный, затем деплой и
   `smoke-prod / smoke (prod)`.

## Обязательные проверки — точные имена

При джобе `ci` в `ci.yml` сайта (как в примере):

| Ветка | Проверки |
|---|---|
| develop | `ci / lint`, `ci / unit`, `ci / integration` |
| main (по желанию) | `ci / lint`, `ci / unit`, `ci / integration`, `stage-smoke` |

Имя — `<id или name джоба в ci.yml сайта> / <джоб здесь>`. Переименовали джоб
сайта — обновите правила, иначе GitHub будет вечно ждать проверку со старым именем.

## Гейт прода

- Деплой `main` вызывает `deploy-gate.yml`. Он берёт коммит, который деплоится:
  если это merge-коммит — проверяет его влитых родителей (голову develop, которую
  деплоили на stage), иначе — сам коммит.
- Проходит, только если у проверяемого коммита статус `stage-smoke = success`.
  `pending` — smoke ещё идёт; `failure` — тесты красные; `error` — smoke не
  запустился; нет статуса — коммит на stage не проверялся. Что делать в каждом
  случае, гейт пишет в ошибке и в сводке.
- **develop вливается в main merge-коммитом** («Create a merge commit»). При
  squash/rebase получается новый коммит без статуса — гейт его не пустит.
- **Ручной обход**: Actions → Deploy → Run workflow → ветка `main` →
  `gate-override-reason` = причина. Гейт пропустит деплой, а в сводке и
  предупреждениях запуска останутся автор, причина и какой smoke был не зелёным.

## Тесты

| Сценарий | Файл | Теги | Где | Нужно |
|---|---|---|---|---|
| Ключевые страницы (главная, категория, товар, поиск + свои): ответ < 400, виден `readySelector`, нет экрана ошибки Next.js и ошибок в консоли браузера | `keyPages.spec.mjs` | `@smoke @prod-safe` | stage, prod | — |
| sitemap.xml и robots.txt отвечают 200 | `seo.spec.mjs` | `@smoke @prod-safe` | stage, prod | — |
| sitemap содержит `<urlset`/`<sitemapindex`, robots — `Sitemap:`, на `seo.indexedPaths` нет `noindex` (meta и X-Robots-Tag) | `seo.spec.mjs` | `@smoke @prod-safe` | только prod (stage закрыт от индексации намеренно) | — |
| Фильтр категории: параметр в URL и товары в выдаче | `categoryFilter.spec.mjs` | `@smoke @prod-safe` | stage, prod | — |
| Гость: каталог → корзина (сумма = цена товара) → заказ с доставкой Новой почтой → заказ в базе с той же суммой и товаром | `guestCheckout.spec.mjs` | `@smoke` | stage | `E2E_TEST_ORDER_TOKEN` |
| Вход и выход покупателя; после выхода старый токен отклоняется API | `customerAuth.spec.mjs` | `@smoke` | stage | секреты покупателя |
| Заказ авторизованного покупателя с автозаполнением; заказ виден в кабинете | `authorizedCheckout.spec.mjs` | `@smoke` | stage | секреты покупателя |
| Вход в админку; список заказов загружается | `adminAccess.spec.mjs` | `@smoke` | stage | секреты админа |
| Тестовый заказ: помечен `isTest`, сумма и товар как в корзине, остаток не изменился, отменён на сайте (и в CRM — на проде) | `testOrder.spec.mjs` | `@smoke @test-order` | stage (товар сида), prod (`testOrder.product`) | `E2E_TEST_ORDER_TOKEN` |
| Каталог: фильтр и сортировка пишут параметры в URL и переставляют товары; ссылка с параметрами открывает ту же выдачу; «назад» возвращает прежнюю | `catalogFilterSort.spec.mjs` | `@regression` | stage | блок `catalogScenario` (§6 контракта) |
| Товар из отфильтрованного каталога открыт на выбранном размере; выбор размера меняет цену и артикул, распроданный размер недоступен | `catalogProductSize.spec.mjs` | `@regression` | stage | блок `catalogScenario` |
| Каталог без товаров показывает сообщение, сброс фильтров возвращает список | `catalogEmptyResult.spec.mjs` | `@regression` | stage | блок `catalogScenario` |
| Два варианта одного товара в корзине: две позиции, у каждой свои размер и фото, сумма — сумма двух цен | `cartVariants.spec.mjs` | `@regression` | stage | блок `cartVariantsScenario` (§7) |
| Правка цены и остатка в админке видна на сайте за 60 с; при остатке 0 товар не купить | `adminCatalogEdit.spec.mjs` | `@regression` | stage | блок `adminCatalogEditScenario` (§8), секреты админа, `E2E_TEST_ORDER_TOKEN` |
| Путь каталог → заказ на iPhone (WebKit): страницы не шире экрана, кнопки нажимаются | `mobileCheckout.spec.mjs` | `@regression @mobile` | stage | блок `mobileCheckoutScenario` (§9), `browsers: chromium webkit` |
| Онлайн-оплата тестовой картой со скидкой: заказ оплачен, сумма одна на оформлении, в счёте банка, на странице «спасибо» и в базе | `onlinePayment.spec.mjs` | `@regression` | stage с тестовым токеном банка | блок `onlinePaymentScenario` (§10), секреты покупателя, `E2E_TEST_ORDER_TOKEN` |

- В тестах нет URL и данных сайта — только из `site.config.mjs` и `site.adapter.mjs`.
- Ответы API Новой почты в браузере подменяются данными из `site.config.mjs`
  (`e2e/lib/novaPoshtaStub.mjs`): smoke не зависит от доступности НП.
- Покупатель-гость вымышленный (`e2e/config/fakeBuyer.config.mjs`): фамилия
  «Тестовий/Тестова», email на `example.com`.
- На проде запускаются только `@prod-safe` и `@test-order`: это задаёт фильтр в
  `playwright.config.mjs` и страхует фикстура `prodWriteProtection`.
- `@regression` (06646) — подробные сценарии второго приоритета. В `@smoke` и
  в гейт прода не входят: сайт запускает их отдельным вызовом `smoke.yml`
  (`grep: "@regression"`, свой `status-context`). Регрессия каталога
  необязательна: сайт без блока `catalogScenario` или шагов адаптера её
  пропускает (`docs/site-contract.md` §6).
- Четыре сценария 06649 (корзина, правки из админки, мобильный путь,
  онлайн-оплата) подключаются так же и по отдельности — §7–§10 контракта. Они
  пишут данные на stage (заказ, правка товара), поэтому сайт запускает
  регрессию **после** smoke, а не параллельно с ним.
- `@mobile` — тест идёт только в проекте `mobile-webkit` (профиль iPhone 14,
  движок WebKit), остальные тесты — только в десктопном `chromium`. WebKit в CI
  ставится, когда вызов `smoke.yml` передаёт `browsers: chromium webkit`.
  Эмуляция не заменяет ручной прогон на настоящем iPhone: она ловит вёрстку и
  нажатия, но не особенности Safari (клавиатура, автозаполнение, Apple Pay).
- Онлайн-оплату библиотека проходит только на тестовой странице банка
  (`e2e/lib/paymentProviders.mjs`, сейчас — monobank): карта вымышленная, деньги
  не движутся. Сайт на stage должен работать с **тестовым** токеном банка.
- Тестовый заказ: заголовок `X-Test-Order-Token` уходит только в запрос
  оформления, пиксели/тег-менеджеры и события витрины в браузере блокируются,
  покупатель — «Тест Автоперевірка» с ничьим номером `+380100000001`
  (`e2e/config/testOrder.config.mjs`). Номер заказа — в аннотации теста в отчёте.
- Тесты идут последовательно (один тестовый покупатель и товар на сайт), в CI —
  один повтор упавшего теста; прошедший с повтора помечается «нестабильным».

## Локальный запуск

```bash
cd e2e
npm ci
# Браузер: либо установленный Edge без загрузки (E2E_BROWSER_CHANNEL=msedge),
# либо Chromium в выбранную папку: PLAYWRIGHT_BROWSERS_PATH=D:/pw-browsers npx playwright install chromium

SITE_E2E_DIR=../../-Sana/e2e E2E_TARGET_ENV=stage \
E2E_BASIC_AUTH_USER=... E2E_BASIC_AUTH_PASSWORD=... \
E2E_BROWSER_CHANNEL=msedge npx playwright test

# Прод: только @prod-safe и @test-order, что бы ни было в E2E_GREP. Без
# E2E_TEST_ORDER_TOKEN тестовый заказ пропускается — остаётся только чтение:
SITE_E2E_DIR=../../-Sana/e2e E2E_TARGET_ENV=prod E2E_BROWSER_CHANNEL=msedge npx playwright test
```

PowerShell:

```powershell
$env:SITE_E2E_DIR = "D:\Work_projects\-Sana\e2e"; $env:E2E_TARGET_ENV = "stage"; $env:E2E_BROWSER_CHANNEL = "msedge"
npx playwright test
```

| Переменная | Что это |
|---|---|
| `SITE_E2E_DIR` | каталог с `site.config.mjs` и `site.adapter.mjs` (обязательна) |
| `E2E_TARGET_ENV` | `stage` (по умолчанию) или `prod` |
| `E2E_GREP` | регулярное выражение отбора тестов, по умолчанию `@smoke` |
| `E2E_BROWSER_CHANNEL` | только локально: `msedge` / `chrome` — установленный браузер вместо скачанного Chromium |
| секреты `E2E_*` | как в CI (раздел 4) |

Полезное: `npx playwright test --list` — какие тесты попадут в запуск;
`npx playwright test tests/keyPages.spec.mjs` — один файл; `--headed` — с окном
браузера.

## Отчёт

- **CI**: запуск в Actions → Summary. Там таблица «Прошло / Упало / Нестабильно /
  Пропущено», упавшие тесты с первой строкой ошибки, пропущенные с причиной и
  ссылка на артефакт `site-smoke-report-stage` / `site-smoke-report-prod`
  (HTML-отчёт Playwright, хранится 14 дней). Скачать zip, распаковать,
  `npx playwright show-report <папка>`. Для упавших с повтора в отчёте есть trace.
  Ссылка на запуск — также в статусе `stage-smoke` у коммита.
- **Локально**: `e2e/playwright-report/` (`npm run report`), результаты в JSON —
  `e2e/test-results/run-results.json`.

## Версии

- Сайты ссылаются на мажорный тег: `uses: keykey-team/site-ci-kit/.github/workflows/ci.yml@v2`
  и `kit-ref: v2` в `smoke.yml` (версия сценариев).
- `v2` (06641): тестовый заказ на проде, проверки суммы корзины, заказа в базе,
  кабинета, отзыва токена, списка заказов в админке и консоли браузера. Новые
  обязательные поля `api.*`, `testOrder.*` и функции адаптера — §3 и §5
  `docs/site-contract.md`. `v1` остаётся для сайтов, которые ещё не перешли.
- Совместимые изменения (новый необязательный input или поле конфига, новый
  тест на уже существующих функциях адаптера, исправление) — новый тег `v2.x.y`
  и перенос `v2` на него:

  ```bash
  git tag v2.1.0 && git tag -f v2 v2.1.0
  git push origin v2.1.0 && git push -f origin v2
  ```

- `v2.2.0` (06646): необязательная регрессия каталога (`@regression`, блок
  `catalogScenario`, §6 контракта); отчёт вызова со своим `status-context`
  получает своё имя артефакта. Сайты, которые её не подключили, ничего не меняют.
- `v2.3.0` (06649): четыре необязательных сценария регрессии (§7–§10 контракта),
  мобильный проект `mobile-webkit` для тестов `@mobile`, input `browsers` у
  `smoke.yml` (по умолчанию `chromium` — как раньше). Сайты, которые сценарии не
  подключили, ничего не меняют.
- `v2.3.1` (06649): basic-auth stage в проекте `mobile-webkit`. WebKit не
  отправляет `httpCredentials` с ограничением по адресу, когда сайт на
  стандартном порту, и мобильный тест получал «401». Заголовок теперь
  добавляется только к запросам на адрес сайта (`e2e/lib/basicAuth.mjs`).
- Несовместимые (новое обязательное поле конфига, новая функция адаптера, смена
  имён джобов или проверок) — следующий мажорный тег (`v3`); сайты переходят на
  него сами, обновив `e2e/`, `@v3` и `kit-ref: v3`.
- Новая **обязательная** функция адаптера — несовместимое изменение: библиотека
  требует все функции контракта, и старые адаптеры сайтов перестанут проходить
  проверку. Необязательные функции (регрессия каталога) совместимы: без них
  тесты пропускаются.
