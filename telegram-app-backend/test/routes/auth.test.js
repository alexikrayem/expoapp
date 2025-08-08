const request = require('supertest')
const bcrypt = require('bcrypt')
const app = require('../../server')

describe('Auth API', () => {
  beforeEach(() => {
    global.mockDb.reset()
  })

  describe('POST /api/auth/supplier/login', () => {
    it('should login supplier with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10)
      const mockSupplier = {
        id: 1,
        email: 'supplier@test.com',
        password_hash: hashedPassword,
        name: 'Test Supplier',
        category: 'Medicine'
      }

      global.mockDb.query.mockResolvedValueOnce({ rows: [mockSupplier] })

      const response = await request(app)
        .post('/api/auth/supplier/login')
        .send({
          email: 'supplier@test.com',
          password: 'password123'
        })
        .expect(200)

      expect(response.body).toHaveProperty('token')
      expect(response.body.supplier).toEqual({
        id: 1,
        name: 'Test Supplier',
        email: 'supplier@test.com',
        category: 'Medicine',
        location: null
      })
    })

    it('should reject invalid credentials', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] })

      await request(app)
        .post('/api/auth/supplier/login')
        .send({
          email: 'invalid@test.com',
          password: 'wrongpassword'
        })
        .expect(401)
    })

    it('should reject missing credentials', async () => {
      await request(app)
        .post('/api/auth/supplier/login')
        .send({})
        .expect(400)
    })
  })

  describe('POST /api/auth/admin/login', () => {
    it('should login admin with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('adminpass', 10)
      const mockAdmin = {
        id: 1,
        email: 'admin@test.com',
        password_hash: hashedPassword,
        full_name: 'Test Admin',
        role: 'admin'
      }

      global.mockDb.query.mockResolvedValueOnce({ rows: [mockAdmin] })

      const response = await request(app)
        .post('/api/auth/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'adminpass'
        })
        .expect(200)

      expect(response.body).toHaveProperty('token')
      expect(response.body.admin.role).toBe('admin')
    })
  })

  describe('POST /api/auth/delivery/login', () => {
    it('should login delivery agent with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('agentpass', 10)
      const mockAgent = {
        id: 1,
        phone_number: '0501234567',
        password_hash: hashedPassword,
        full_name: 'Test Agent',
        supplier_id: 1
      }

      global.mockDb.query.mockResolvedValueOnce({ rows: [mockAgent] })

      const response = await request(app)
        .post('/api/auth/delivery/login')
        .send({
          phoneNumber: '0501234567',
          password: 'agentpass'
        })
        .expect(200)

      expect(response.body).toHaveProperty('token')
      expect(response.body.agent.supplierId).toBe(1)
    })
  })
})