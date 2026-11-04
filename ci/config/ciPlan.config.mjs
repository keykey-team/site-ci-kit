// Правила планировщика CI (07385). Только значения — поведение в ci/lib/.

// Виды проверок, которые умеет запускать ci.yml. Порядок — порядок в сводке.
export const CHECK_KINDS = Object.freeze(["lint", "unit", "integration", "build"]);

// Статус коммита «ровно это дерево файлов уже проверено». По нему повторный
// прогон того же кода (PR → слияние → PR develop→main → деплой) пропускается.
export const TESTED_TREE_STATUS_CONTEXT = "site-ci/tested-tree";

// Формат описания статуса: «tree <sha дерева> · <проверки через пробел>».
// GitHub обрезает описание до 140 символов — этот формат занимает ~75.
export const TESTED_TREE_DESCRIPTION_PREFIX = "tree";
export const TESTED_TREE_DESCRIPTION_SEPARATOR = " · ";

// Сколько статусов коммита читать при поиске отметки: у коммита их единицы,
// 100 — максимум страницы API.
export const COMMIT_STATUSES_PAGE_SIZE = 100;

// API сравнения коммитов отдаёт не больше 300 файлов. Если их столько — список
// мог обрезаться, и планировщик запускает всё, а не гадает.
export const COMPARE_FILES_LIMIT = 300;

// Список файлов PR API отдаёт до 3000 (страницы по 100).
export const PULL_REQUEST_FILES_PAGE_SIZE = 100;
export const PULL_REQUEST_FILES_LIMIT = 3000;

// SHA «коммита до push» у новой ветки — одни нули.
export const EMPTY_COMMIT_SHA_PATTERN = /^0+$/;

// Файл-отметка «зависимости этой области уже установлены вот этим ключом»
// внутри каждого каталога node_modules области. Свой раннер не стирает
// node_modules между запусками, и повторная установка пропускается.
export const INSTALL_MARKER_FILE_NAME = ".site-ci-install-key";

// Сколько изменённых файлов области показывать в сводке запуска.
export const SUMMARY_FILES_PER_AREA = 8;
