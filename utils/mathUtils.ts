
/**
 * Senior QA Auditor's Utility: Mathematical Precision
 * Prevents floating point errors (e.g., 0.1 + 0.2 = 0.30000000000000004)
 */

export const Money = {
    /**
     * Rounds a number to a specific number of decimal places safely.
     */
    round: (value: number | string, decimals: number = 2): number => {
        const factor = Math.pow(10, decimals);
        return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
    },

    /**
     * Safely adds multiple numbers.
     */
    add: (...values: (number | string)[]): number => {
        return Money.round(values.reduce((acc: number, val) => acc + Number(val || 0), 0));
    },

    /**
     * Safely subtracts multiple numbers.
     */
    subtract: (base: number | string, ...values: (number | string)[]): number => {
        return Money.round(values.reduce((acc: number, val) => acc - Number(val || 0), Number(base || 0)));
    },

    /**
     * Safely multiplies numbers.
     */
    multiply: (a: number | string, b: number | string): number => {
        return Money.round(Number(a || 0) * Number(b || 0));
    },

    /**
     * Calculates tax amount for a given total and tax rate.
     * Logic: (Total * Rate) / 100
     */
    calculateTax: (total: number | string, rate: number | string): number => {
        return Money.round((Number(total || 0) * Number(rate || 0)) / 100);
    },

    /**
     * Calculates percentage discount safely.
     */
    calculateDiscount: (total: number | string, discountValue: number | string, isPercentage: boolean): number => {
        if (isPercentage) {
            return Money.round((Number(total || 0) * Number(discountValue || 0)) / 100);
        }
        return Money.round(Number(discountValue || 0));
    }
};
