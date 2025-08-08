const { Pool } = require('pg')

// Mock database
const mockQuery = jest.fn()
const mockConnect = jest.fn()
const mockRelease = jest.fn()

const mockClient = {
  query: mockQuery,
  release: mockRelease
}

const mockPool = {
  query: mockQuery,
  connect: jest.fn().mockResolvedValue(mockClient),
  end: jest.fn()
}

// Mock the database module
jest.mock('../config/db', () => ({
  query: mockQuery,
  pool: mockPool
}))

// Mock Telegram Bot
jest.mock('node-telegram-bot-api', () => {
  return jest.fn().mockImplementation(() => ({
    onText: jest.fn(),
    on: jest.fn(),
    sendMessage: jest.fn().mockResolvedValue(true),
    answerCallbackQuery: jest.fn().mockResolvedValue(true)
  }))
})

// Setup global test utilities
global.mockDb = {
  query: mockQuery,
  pool: mockPool,
  client: mockClient,
  reset: () => {
    mockQuery.mockReset()
    mockConnect.mockReset()
    mockRelease.mockReset()
  }
}

// Mock environment variables
process.env.JWT_SECRET = 'test_jwt_secret'
process.env.JWT_ADMIN_SECRET = 'test_admin_secret'
process.env.JWT_DELIVERY_SECRET = 'test_delivery_secret'
process.env.TELEGRAM_BOT_TOKEN = 'test_bot_token'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'