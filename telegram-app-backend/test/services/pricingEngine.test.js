const { calculateDemandAndAdjustPercentage } = require('../../services/pricingEngine');

describe('pricingEngine', () => {
  beforeEach(() => {
    global.mockDb.reset();
    process.env.PRICING_WINDOW_SHORT_DAYS = '7';
    process.env.PRICING_WINDOW_LONG_DAYS = '30';
    process.env.PRICING_MOMENTUM_STEP = '0.02';
    process.env.PRICING_MAX_STEP = '0.02';
    process.env.PRICING_MIN_ADJ = '-0.1';
    process.env.PRICING_MAX_ADJ = '0.1';
    process.env.PRICING_COOLDOWN_HOURS = '6';
  });

  it('passes configured parameters to the adjustment query', async () => {
    global.mockDb.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ acquired: true }] }) // advisory lock
      .mockResolvedValueOnce({ rows: [] }) // UPDATE
      .mockResolvedValueOnce({}); // COMMIT

    await calculateDemandAndAdjustPercentage();

    const updateCall = global.mockDb.query.mock.calls.find((call) => {
      return typeof call[0] === 'string' && call[0].includes('UPDATE master_products');
    });

    expect(updateCall).toBeTruthy();
    expect(updateCall[1]).toEqual([
      7,
      30,
      0.02,
      0.02,
      -0.1,
      0.1,
      6,
    ]);
  });
});
