import { randomBytes, randomInt } from "node:crypto";
import {
  FAKE_BUYER_EMAIL_DOMAIN,
  FAKE_BUYER_EMAIL_PREFIX,
  FAKE_BUYER_IDENTITIES,
  FAKE_BUYER_ORDER_COMMENT,
  FAKE_BUYER_PHONE_COUNTRY_CODE,
  FAKE_BUYER_PHONE_OPERATOR_CODE,
  FAKE_BUYER_PHONE_RANDOM_DIGIT_COUNT,
  FAKE_BUYER_PHONE_SUBSCRIBER_PREFIX,
  FAKE_BUYER_PHONE_TRUNK_PREFIX,
  FAKE_BUYER_UNIQUE_SUFFIX_LENGTH,
} from "../config/fakeBuyer.config.mjs";

// Цифр у десятковій системі: randomInt(10) дає одну цифру 0–9.
const DECIMAL_DIGIT_VARIANT_COUNT = 10;

function generateRandomDigits(digitCount) {
  return Array.from({ length: digitCount }, () => randomInt(DECIMAL_DIGIT_VARIANT_COUNT)).join("");
}

function generateUniqueSuffix() {
  return randomBytes(FAKE_BUYER_UNIQUE_SUFFIX_LENGTH).toString("hex").slice(0, FAKE_BUYER_UNIQUE_SUFFIX_LENGTH);
}

/**
 * Вигаданий покупець-гість. Телефон — у двох форматах, бо сайти просять його
 * по-різному: з +380 або з 0 на початку.
 */
export function createFakeBuyer() {
  const buyerIdentity = FAKE_BUYER_IDENTITIES[randomInt(FAKE_BUYER_IDENTITIES.length)];
  const subscriberNumber =
    FAKE_BUYER_PHONE_SUBSCRIBER_PREFIX + generateRandomDigits(FAKE_BUYER_PHONE_RANDOM_DIGIT_COUNT);
  const nationalPhone = `${FAKE_BUYER_PHONE_TRUNK_PREFIX}${FAKE_BUYER_PHONE_OPERATOR_CODE}${subscriberNumber}`;
  return {
    firstName: buyerIdentity.firstName,
    middleName: buyerIdentity.middleName,
    lastName: buyerIdentity.lastName,
    fullName: `${buyerIdentity.lastName} ${buyerIdentity.firstName} ${buyerIdentity.middleName}`,
    phoneInternational: `+${FAKE_BUYER_PHONE_COUNTRY_CODE}${FAKE_BUYER_PHONE_OPERATOR_CODE}${subscriberNumber}`,
    phoneNational: nationalPhone,
    email: `${FAKE_BUYER_EMAIL_PREFIX}-${generateUniqueSuffix()}@${FAKE_BUYER_EMAIL_DOMAIN}`,
    orderComment: FAKE_BUYER_ORDER_COMMENT,
  };
}
