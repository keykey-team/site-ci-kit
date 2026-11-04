// Приклад .github/site-ci-areas.config.mjs сайту (07385, docs/site-contract.md §1):
// сервер і клієнт в окремих каталогах, як у Sana. Файл без імпортів — CI читає
// його через API GitHub.
//
// Правка зачепила область → ідуть її перевірки; файл поза всіма областями й
// списками запускає ВСЕ.
export default {
  // Збірка й CI: правка тут може зламати що завгодно.
  runEverythingPaths: [".github/**", "scripts/**", "ecosystem.config.cjs"],
  // Не код: документація і сценарії smoke (їх перевіряє smoke після деплою).
  ignoredPaths: ["docs/**", "**/*.md", "e2e/**"],
  areas: {
    server: {
      paths: ["server/**"],
      install: "npm ci --prefix server --no-audit --no-fund",
      // На своєму раннері node_modules лишаються між запусками: установка
      // пропускається, поки lock-файл (і команда, і Node) той самий.
      installKeyFiles: ["server/package-lock.json"],
      installedDirectories: ["server/node_modules"],
      checks: {
        lint: "npm run lint:changed --prefix server",
        unit: "npm run test:unit --prefix server",
        integration: "npm run test:integration --prefix server",
      },
    },
    client: {
      paths: ["client/**"],
      // Лише тексти й картинки — без юніт-тестів, але зі збіркою.
      contentOnlyPaths: ["client/public/**"],
      contentOnlyChecks: ["lint", "build"],
      jsonFilePaths: ["client/public/locales/**/*.json"],
      install: "npm ci --prefix client --no-audit --no-fund",
      installKeyFiles: ["client/package-lock.json"],
      installedDirectories: ["client/node_modules"],
      checks: {
        lint: "npm run lint:changed --prefix client",
        unit: "npm run test:unit --prefix client",
        build: "cd client && NEXT_PUBLIC_API_URL=https://example.com npm run build",
      },
    },
  },
};
