const { computeEffectivePrice } = require('../../utils/pricing');

describe('pricing utils', () => {
  it('uses discount price when on sale (no dynamic adjustment)', () => {
    const price = computeEffectivePrice({
      price: 100,
      discount_price: 75,
      is_on_sale: true,
      adjustment_percentage: 0.1,
    });

    expect(price).toBe(75);
  });

  it('never drops below base price', () => {
    const price = computeEffectivePrice({
      price: 100,
      discount_price: null,
      is_on_sale: false,
      adjustment_percentage: -0.5,
    });

    expect(price).toBe(100);
  });

  it('caps effective price at +10% above base', () => {
    const price = computeEffectivePrice({
      price: 100,
      discount_price: null,
      is_on_sale: false,
      adjustment_percentage: 0.2,
    });

    expect(price).toBe(110);
  });

  it('rounds to 2 decimals for non-sale items', () => {
    const price = computeEffectivePrice({
      price: 99.99,
      discount_price: null,
      is_on_sale: false,
      adjustment_percentage: 0.0333,
    });

    expect(price).toBe(103.32);
  });
});
