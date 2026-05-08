const adminUtils = require('../../routes/admin/adminUtils');

describe('adminUtils exports', () => {
  it('exposes HTTP constants used by admin routes', () => {
    expect(adminUtils.HTTP).toEqual({
      BAD_REQUEST: 400,
      NOT_FOUND: 404,
      CONFLICT: 409,
      CREATED: 201,
      INTERNAL_SERVER_ERROR: 500,
    });
  });

  it('exposes cache key groups for admin cache invalidation', () => {
    expect(adminUtils.ADMIN_CACHE_KEYS).toEqual(expect.arrayContaining([
      'products:list',
      'products:categories',
      'suppliers:list',
      'featured:items',
      'featured:list',
    ]));

    expect(adminUtils.FEATURED_CACHE_KEYS).toEqual(['featured:items', 'featured:list']);
    expect(adminUtils.FEATURED_LIST_CACHE_KEYS).toEqual(['featured:list', 'featured:items']);
  });

  it('provides validation middleware chains for admin endpoints', () => {
    expect(Array.isArray(adminUtils.validateCreateSupplier)).toBe(true);
    expect(Array.isArray(adminUtils.validateUpdateSupplier)).toBe(true);
    expect(Array.isArray(adminUtils.validateCreateFeaturedItem)).toBe(true);
    expect(Array.isArray(adminUtils.validateUpdateFeaturedItem)).toBe(true);
    expect(Array.isArray(adminUtils.validateBroadcast)).toBe(true);
    expect(Array.isArray(adminUtils.validateCreateFeaturedList)).toBe(true);

    expect(adminUtils.validateCreateSupplier.length).toBeGreaterThan(1);
    expect(adminUtils.validateUpdateSupplier.length).toBeGreaterThan(1);
    expect(adminUtils.validateCreateFeaturedItem.length).toBeGreaterThan(1);
    expect(adminUtils.validateUpdateFeaturedItem.length).toBeGreaterThan(1);
    expect(adminUtils.validateBroadcast.length).toBeGreaterThan(1);
    expect(adminUtils.validateCreateFeaturedList.length).toBeGreaterThan(1);
  });
});
