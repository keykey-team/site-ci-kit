// Правила автовыкатки на прод по метке PR (07385). Только значения —
// поведение в ci/lib/releaseToProd.mjs.

// API сравнения веток отдаёт до 250 коммитов. Если «невыпущенного» в develop
// больше — проверить, что оно всё из этого PR, нельзя, и автовыкатки нет.
export const COMPARE_COMMITS_LIMIT = 250;

// Коммиты PR — страницами по 100, всего не больше 250 (предел API).
export const PULL_REQUEST_COMMITS_PAGE_SIZE = 100;

// Сколько чужих коммитов перечислять в комментарии к PR.
export const FOREIGN_COMMITS_SHOWN_IN_COMMENT = 10;

// HTTP-ответы API слияния веток: 204 — сливать нечего (уже в main), 409 — конфликт.
export const MERGE_NOTHING_TO_MERGE_STATUS = 204;
export const MERGE_CONFLICT_STATUS = 409;
