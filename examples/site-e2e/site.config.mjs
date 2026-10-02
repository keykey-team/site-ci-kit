// Шаблон e2e/site.config.mjs для репозиторію сайту (docs/site-contract.md §3).
// Скопіюйте в <репозиторій сайту>/e2e/site.config.mjs і замініть усі TODO.
// Тут — лише дані сайту. Секрети (паролі, телефон і код тестового покупця,
// логін адміна) сюди НЕ пишуться: вони приходять з env раннера.
export default {
  // TODO: короткий ключ сайту (той самий, що в моніторингу: sana, rosteria).
  siteKey: "example-shop",

  // TODO: адреси stage і проду без слешу в кінці.
  baseUrls: {
    stage: "https://dev.example-shop.com.ua",
    prod: "https://example-shop.com.ua",
  },

  // Ключові сторінки: шлях + селектор, поява якого означає «сторінка готова».
  // home, category, product, search — обов'язкові; можна додати свої.
  // Селектор — стабільний елемент контенту (картка товару, заголовок), а не
  // шапка: шапка є і на сторінці помилки.
  keyPages: {
    home: { path: "/", readySelector: "main" },
    // TODO: категорія з товарами, що завжди є в наявності.
    category: { path: "/catalog/all", readySelector: ".product-card" },
    // TODO: товар із сиду stage (slug з префіксом e2e-). На проді цього
    // товару немає — візьміть товар, що є і там, або тримайте окремий
    // постійний товар для перевірки.
    product: { path: "/product/e2e-sneakers", readySelector: "h1" },
    // TODO: пошук за словом, що гарантовано дає результати.
    search: { path: "/catalog/search/nike", readySelector: ".product-card" },
  },

  // Фільтр категорії: де його ставити і який параметр має з'явитися в URL.
  // Бібліотека сама відкриває categoryPath, адаптер лише ставить фільтр.
  categoryFilter: {
    categoryPath: "/catalog/all",
    // TODO: ключ параметра фільтра в URL (як після декодування: attrs[rozmir]).
    expectedUrlParam: "attrs[rozmir]",
  },

  // Товар із сиду stage, який тести кладуть у кошик. Залишок — великий
  // (кожен запуск створює 2 замовлення) або його повертає `npm run seed:reset`.
  testProduct: {
    path: "/product/e2e-sneakers",
    // TODO: опція варіанта (розмір, вага) — як підписана на кнопці.
    optionLabel: "42",
  },

  // API сайту для перевірок без браузера (06641, docs/site-contract.md §5).
  // Шляхи — відносно baseUrls; {orderNumber} і {sku} підставляє бібліотека.
  api: {
    // TODO: захищений GET покупця: 200 з живим Bearer-токеном, 401 після виходу.
    customerProfilePath: "/api/auth/me",
    // TODO: читання замовлення за X-Test-Order-Token (без персональних даних).
    testOrderReadPath: "/api/orders/e2e/{orderNumber}",
    // TODO: поточний залишок варіанта за SKU (за тим самим заголовком).
    stockReadPath: "/api/catalog/e2e/stock/{sku}",
  },

  // Тестове замовлення на проді (06641): справжній товар, що є в наявності на
  // проді. На stage тест бере testProduct із сиду.
  testOrder: {
    // TODO: glob запиту оформлення — лише до нього бібліотека додає X-Test-Order-Token.
    createOrderUrlPattern: "**/api/orders/create-order",
    // TODO: товар, який рідко закінчується; optionLabel: null — перший доступний варіант.
    product: { path: "/product/some-real-product", optionLabel: null },
    // Необов'язково: свої лічильники аналітики, крім типових (GA, Pixel, TikTok, /api/metrics/event).
    blockedRequestPatterns: [],
  },

  // Відомий шум у консолі, який сайт поки не виправив (regex-рядки). Помилки
  // сторонніх скриптів (пікселі, віджети) бібліотека й так не рахує. Масив — для
  // всіх оточень; { stage: [...], prod: [...] } — шум лише одного оточення.
  consoleErrorIgnorePatterns: [],

  // Нова пошта: справжні Ref (сервер сайту їх перевіряє), відповіді API НП у
  // браузері підміняються з цих даних — smoke не залежить від доступності НП.
  // Ref беруться з API НП: getCities (cityRef), getWarehouses (warehouseRef),
  // getAreas (areaRef).
  novaPoshta: {
    cityName: "Київ",
    cityRef: "TODO-city-ref",
    // TODO: точна назва відділення, як її повертає НП.
    warehouseName: "Відділення №1: вул. Пирогівський шлях, 135",
    warehouseRef: "TODO-warehouse-ref",
    warehouseNumber: "1",
    // Обов'язково, якщо на сайті спочатку обирають область (як у Sana).
    areaName: "Київська",
    areaRef: "TODO-area-ref",
  },

  // SEO на проді: sitemap/robots і сторінки, які мають індексуватися.
  seo: {
    sitemapPath: "/sitemap.xml",
    robotsPath: "/robots.txt",
    indexedPaths: ["/", "/catalog/all"],
  },
};
