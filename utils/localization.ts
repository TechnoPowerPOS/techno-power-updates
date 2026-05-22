
export const CURRENCIES = {
  SAR: { name: 'ريال سعودي', symbol: 'ر.س' },
  EGP: { name: 'جنيه مصري', symbol: 'ج.م' },
  USD: { name: 'دولار أمريكي', symbol: '$' },
  EUR: { name: 'يورو', symbol: '€' },
  AED: { name: 'درهم إماراتي', symbol: 'د.إ' },
  KWD: { name: 'دينار كويتي', symbol: 'د.ك' },
  BHD: { name: 'دينار بحريني', symbol: 'د.ب' },
  QAR: { name: 'ريال قطري', symbol: 'ر.ق' },
  OMR: { name: 'ريال عماني', symbol: 'ر.ع.' },
  JOD: { name: 'دينار أردني', symbol: 'د.أ' },
  IQD: { name: 'دينار عراقي', symbol: 'د.ع' },
  LYD: { name: 'دينار ليبي', symbol: 'د.ل' },
  DZD: { name: 'دينار جزائري', symbol: 'د.ج' },
  MAD: { name: 'درهم مغربي', symbol: 'د.م.' },
  TND: { name: 'دينار تونسي', symbol: 'د.ت' },
  SDG: { name: 'جنيه سوداني', symbol: 'ج.س' },
  LBP: { name: 'ليرة لبنانية', symbol: 'ل.ل' },
  SYP: { name: 'ليرة سورية', symbol: 'ل.س' },
  YER: { name: 'ريال يمني', symbol: 'ر.ي' },
  MRU: { name: 'أوقية موريتانية', symbol: 'أ.م' },
  DJF: { name: 'فرنك جيبوتي', symbol: 'ف.ج' },
  SOS: { name: 'شلن صومالي', symbol: 'ش.ص' },
  KMF: { name: 'فرنك قمري', symbol: 'ف.ق' },
  TRY: { name: 'ليرة تركية', symbol: '₺' },
};

export type CurrencyCode = keyof typeof CURRENCIES;

const arabicIndicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Converts a number or a string containing a number to Arabic-Indic numerals.
 */
export const toArabicIndic = (number: number | string): string => {
  return String(number).replace(/[0-9]/g, (d) => arabicIndicNumerals[parseInt(d)]);
};

/**
 * Formats a numerical amount with Arabic-Indic numerals with 2 decimal places.
 */
export const formatAmount = (amount: number | undefined | null): string => {
    const safeAmount = Number(amount) || 0;
    const formattedAmount = safeAmount.toLocaleString('en-US', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 2 
    });
    return toArabicIndic(formattedAmount);
}

/**
 * Formats a currency value with Arabic-Indic numerals and the appropriate currency symbol.
 */
export const formatCurrency = (amount: number | undefined | null, currencyCode: string = 'SAR'): string => {
  const code = currencyCode as CurrencyCode;
  const currency = CURRENCIES[code] || CURRENCIES.SAR;
  return `${formatAmount(amount)} ${currency.symbol}`;
};
