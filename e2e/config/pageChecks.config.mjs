// Ознаки «сторінка зламана», однакові для всіх сайтів на Next.js.

// Коди відповіді від 400 — клієнтська або серверна помилка: ключова
// сторінка такою бути не може.
export const HTTP_ERROR_STATUS_MIN = 400;
export const HTTP_OK_STATUS = 200;

// Стандартна сторінка помилки Next.js (404/500) — заголовок з цим класом.
// Кастомні сторінки помилок сайту ловить код відповіді вище.
export const PAGE_ERROR_SELECTORS = [".next-error-h1"];

// Текст, який Next.js показує замість сторінки, коли впав клієнтський рендер
// (код відповіді при цьому 200 — тому окрема перевірка).
export const PAGE_ERROR_TEXTS = ["Application error: a client-side exception has occurred"];

// Корінь валідного sitemap: звичайний список URL або індекс sitemap-файлів.
export const SITEMAP_ROOT_MARKERS = ["<urlset", "<sitemapindex"];

// Рядок у robots.txt, яким пошуковик знаходить sitemap.
export const ROBOTS_SITEMAP_DIRECTIVE_PATTERN = /^\s*Sitemap:/im;

// Заборона індексації — у meta robots/googlebot або в заголовку X-Robots-Tag.
export const NOINDEX_PATTERN = /noindex/i;
export const ROBOTS_META_SELECTOR = 'meta[name="robots"], meta[name="googlebot"]';
export const ROBOTS_HEADER_NAME = "x-robots-tag";
