const TelegramBotService = require('../../services/telegramBot')

// Mock the database
const mockDb = {
  query: jest.fn()
}

jest.mock('../../config/db', () => mockDb)

describe('Telegram Bot Service', () => {
  let botService

  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.query.mockReset()
  })

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
    }

    it('should send notification to delivery agent', async () => {
      const mockAgent = {
        telegram_user_id: '987654321',
        full_name: 'Test Agent',
        supplier_name: 'Test Supplier'
      }

      mockDb.query.mockResolvedValueOnce({ rows: [mockAgent] })

      const result = await botService.sendOrderNotificationToDeliveryAgent(mockOrderData)

      expect(result).toBe(true)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('delivery_agents'),
        [mockOrderData.supplierId]
      )
    })

    it('should handle missing delivery agent', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] })

      const result = await botService.sendOrderNotificationToDeliveryAgent(mockOrderData)

      expect(result).toBe(false)
    })

    it('should handle telegram send errors', async () => {
      const mockAgent = {
        telegram_user_id: '987654321',
        full_name: 'Test Agent'
      }

      mockDb.query.mockResolvedValueOnce({ rows: [mockAgent] })
      
      // Mock bot sendMessage to reject
      const mockBot = {
        sendMessage: jest.fn().mockRejectedValue(new Error('Telegram error'))
      }
      botService.bot = mockBot

      const result = await botService.sendOrderNotificationToDeliveryAgent(mockOrderData)

      expect(result).toBe(false)
    })
  })

  describe('broadcastToAllUsers', () => {
    it('should broadcast message to all users', async () => {
      const mockUsers = [
        { telegram_user_id: '123456789' },
        { telegram_user_id: '987654321' }
      ]

      mockDb.query.mockResolvedValueOnce({ rows: mockUsers })

      const mockBot = {
        sendMessage: jest.fn().mockResolvedValue(true)
      }
      botService.bot = mockBot

      const result = await botService.broadcastToAllUsers('Test message', 1)

      expect(result.successCount).toBe(2)
      expect(result.failCount).toBe(0)
      expect(mockBot.sendMessage).toHaveBeenCalledTimes(2)
    })

    it('should handle partial failures in broadcast', async () => {
      const mockUsers = [
        { telegram_user_id: '123456789' },
        { telegram_user_id: '987654321' }
      ]

      mockDb.query.mockResolvedValueOnce({ rows: mockUsers })

      const mockBot = {
        sendMessage: jest.fn()
          .mockResolvedValueOnce(true)
          .mockRejectedValueOnce(new Error('User blocked bot'))
      }
      botService.bot = mockBot

      const result = await botService.broadcastToAllUsers('Test message', 1)

      expect(result.successCount).toBe(1)
      expect(result.failCount).toBe(1)
    })
  })

  describe('getPlatformStats', () => {
    it('should return platform statistics', async () => {
      const mockStats = {
        total_users: 100,
        total_suppliers: 10,
        total_agents: 5,
        orders_today: 20,
        sales_this_month: 5000
      }

      mockDb.query.mockResolvedValueOnce({ rows: [mockStats] })

      const result = await botService.getPlatformStats()

      expect(result).toEqual(mockStats)
    })

    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'))

      const result = await botService.getPlatformStats()

      expect(result).toEqual({
        total_users: 0,
        total_suppliers: 0,
        total_agents: 0,
        orders_today: 0,
        sales_this_month: 0
      })
    })
  })
})