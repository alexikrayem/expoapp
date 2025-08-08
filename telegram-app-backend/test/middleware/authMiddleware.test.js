const { validateTelegramAuth } = require('../../middleware/authMiddleware')

describe('Telegram Auth Middleware', () => {
  let req, res, next

  beforeEach(() => {
    req = {
      header: jest.fn(),
      headers: {}
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    next = jest.fn()
    
    // Reset environment
    process.env.NODE_ENV = 'production'
  })

  it('should allow development bypass', () => {
    process.env.NODE_ENV = 'development'
    req.header.mockReturnValue('true')

    validateTelegramAuth(req, res, next)

    expect(req.telegramUser).toEqual({
      id: 123456789,
      first_name: 'Local',
      last_name: 'Dev'
    })
    expect(next).toHaveBeenCalled()
  })

  it('should reject missing init data in production', () => {
    req.header.mockReturnValue(null)

    validateTelegramAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Authentication required: X-Telegram-Init-Data header is missing.'
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('should reject invalid hash', () => {
    req.header.mockReturnValue('user=%7B%22id%22%3A123%7D&hash=invalid_hash')

    validateTelegramAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('should handle malformed init data', () => {
    req.header.mockReturnValue('invalid_data')

    validateTelegramAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(next).not.toHaveBeenCalled()
  })
})