const { validateTelegramAuth } = require('../../middleware/authMiddleware')
const jwt = require('jsonwebtoken')

describe('JWT Auth Middleware', () => {
  let req, res, next

  beforeEach(() => {
    req = {
      headers: {}
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    next = jest.fn()

    // Reset environment
    process.env.NODE_ENV = 'production'
    process.env.JWT_SECRET = 'test_secret'
  })

  it('should allow development bypass', () => {
    process.env.NODE_ENV = 'development'
    process.env.DEV_BYPASS_SECRET = 'test_secret'
    req.headers.authorization = 'Bearer bypass_token'
    req.ip = '127.0.0.1'
    req.headers['x-dev-bypass-auth'] = 'test_secret'

    validateTelegramAuth(req, res, next)

    expect(req.user).toEqual({
      userId: 123456789,
      telegramId: 123456789,
      first_name: 'Local',
      last_name: 'Dev',
      role: 'customer'
    })
    expect(next).toHaveBeenCalled()
  })

  it('should reject missing authorization header', () => {
    validateTelegramAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Access token required.'
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should reject invalid authorization header format', () => {
    req.headers.authorization = 'InvalidToken'

    validateTelegramAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Access token required.'
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should reject invalid JWT token', () => {
    req.headers.authorization = 'Bearer invalid_token'

    validateTelegramAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid or expired token.'
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should accept valid JWT token', () => {
    const validToken = jwt.sign(
      { userId: 123456, telegramId: 123456, role: 'customer' },
      process.env.JWT_SECRET
    )
    req.headers.authorization = `Bearer ${validToken}`

    validateTelegramAuth(req, res, next)

    expect(req.user).toEqual({
      userId: 123456,
      telegramId: 123456,
      role: 'customer',
      iat: expect.any(Number),
      exp: expect.any(Number)
    })
    expect(next).toHaveBeenCalled()
  })
})