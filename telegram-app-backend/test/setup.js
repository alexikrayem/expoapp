const { Pool } = require('pg')
const net = require('net')

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

// Jest runs in a sandbox that disallows binding to 0.0.0.0. Force loopback.
const originalListen = net.Server.prototype.listen
net.Server.prototype.listen = function patchedListen(...args) {
  if (args.length === 0) {
    return originalListen.call(this, 0, '127.0.0.1')
  }

  const [arg0, arg1] = args

  if (arg0 && typeof arg0 === 'object') {
    if (!arg0.host) {
      arg0.host = '127.0.0.1'
    }
    return originalListen.call(this, ...args)
  }

  if (typeof arg0 === 'number') {
    if (typeof arg1 === 'function' || arg1 === undefined) {
      return originalListen.call(this, arg0, '127.0.0.1', ...args.slice(1))
    }
  }

  if (typeof arg0 === 'string' && /^[0-9]+$/.test(arg0)) {
    if (typeof arg1 === 'function' || arg1 === undefined) {
      return originalListen.call(this, Number(arg0), '127.0.0.1', ...args.slice(1))
    }
  }

  return originalListen.call(this, ...args)
}
