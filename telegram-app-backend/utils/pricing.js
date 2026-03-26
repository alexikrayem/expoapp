// utils/pricing.js
// Shared SQL snippet and helper for effective selling price (base price floor, +10% cap).

const EFFECTIVE_PRICE_SQL = `
    CASE
        WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL THEN p.discount_price
        ELSE ROUND(
            LEAST(
                GREATEST(p.price * (1 + COALESCE(mp.current_price_adjustment_percentage, 0)), p.price),
                p.price * 1.10
            ),
            2
        )
    END
`;

const roundMoney = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.round((numeric + Number.EPSILON) * 100) / 100;
};

const computeEffectivePrice = ({ price, discount_price, is_on_sale, adjustment_percentage }) => {
    const basePrice = Number(price);
    if (!Number.isFinite(basePrice)) return 0;

    if (is_on_sale && discount_price !== null && discount_price !== undefined) {
        return Number(discount_price);
    }

    const adjustment = Number(adjustment_percentage) || 0;
    const raw = basePrice * (1 + adjustment);
    const clamped = Math.min(Math.max(raw, basePrice), basePrice * 1.10);
    return roundMoney(clamped);
};

module.exports = { EFFECTIVE_PRICE_SQL, computeEffectivePrice };
