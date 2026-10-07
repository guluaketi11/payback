export const currencies = {
  GEL: { label: 'GEL ₾', locale: 'en-US', code: 'GEL' },
  USD: { label: 'USD $', locale: 'en-US', code: 'USD' },
  EUR: { label: 'EUR €', locale: 'de-DE', code: 'EUR' },
};

export type Currency = keyof typeof currencies;

export const money = (value: number, currency: Currency, digits = 0) =>
  new Intl.NumberFormat(currencies[currency].locale, {
    style: 'currency',
    currency: currencies[currency].code,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);

export const compactMoney = (value: number, currency: Currency) =>
  new Intl.NumberFormat(currencies[currency].locale, {
    style: 'currency',
    currency: currencies[currency].code,
    currencyDisplay: 'narrowSymbol',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
