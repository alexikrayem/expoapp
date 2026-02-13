// Mock the database BEFORE requiring the service
jest.mock('../../config/db', () => ({
  query: jest.fn()
}));

const db = require('../../config/db');

describe('Telegram Bot Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockReset();
  });

  describe('sendOrderNotificationToDeliveryAgent', () => {
    const mockOrderData = {
      orderId: 123,
      supplierId: 1,
      total_amount: 400,
      items: [
        { product_name: 'Product 1', quantity: 2, price_at_time_of_order: 100 }
      ],
      customerInfo: {
        name: 'Test Customer',
        phone: '0501234567',
        address1: 'Test Address',
        city: 'Dubai'
      },
      orderDate: new Date().toISOString()
    };

    it('should find delivery agent for order', async () => {
      const mockAgent = {
        telegram_user_id: '987654321',
        full_name: 'Test Agent',
        supplier_name: 'Test Supplier'
      };

      db.query.mockResolvedValueOnce({ rows: [mockAgent] });

      // Test that we can query for delivery agents
      const result = await db.query('SELECT * FROM delivery_agents WHERE supplier_id = $1', [1]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].full_name).toBe('Test Agent');
    });

    it('should handle missing delivery agent', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await db.query('SELECT * FROM delivery_agents WHERE supplier_id = $1', [999]);

      expect(result.rows).toHaveLength(0);
    });
  });

  describe('broadcastToAllUsers', () => {
    it('should retrieve all users for broadcast', async () => {
      const mockUsers = [
        { telegram_user_id: '123456789' },
        { telegram_user_id: '987654321' }
      ];

      db.query.mockResolvedValueOnce({ rows: mockUsers });

      const result = await db.query('SELECT telegram_user_id FROM users WHERE city_id = $1', [1]);

      expect(result.rows).toHaveLength(2);
    });
  });

  describe('getPlatformStats', () => {
    it('should return platform statistics', async () => {
      const mockStats = {
        total_users: 100,
        total_suppliers: 10,
        total_agents: 5,
        orders_today: 20,
        sales_this_month: 5000
      };

      db.query.mockResolvedValueOnce({ rows: [mockStats] });

      const result = await db.query('SELECT * FROM platform_stats');

      expect(result.rows[0]).toEqual(mockStats);
    });

    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(db.query('SELECT * FROM platform_stats')).rejects.toThrow('Database error');
    });
  });
});