const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Create mock auth middleware
const mockAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Create a test app with mocked middleware
const createTestApp = () => {
    const app = express();
    app.use(express.json());

    // Mount user routes with our mock auth middleware
    const userRouter = express.Router();

    // Mock the profile endpoint
    userRouter.get('/profile', mockAuthMiddleware, async (req, res) => {
        try {
            const mockProfile = await global.mockDb.query();
            res.json(mockProfile.rows[0]);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch profile' });
        }
    });

    userRouter.get('/favorites', mockAuthMiddleware, async (req, res) => {
        try {
            const result = await global.mockDb.query();
            const ids = result.rows[0]?.favorite_product_ids || [];
            res.json({ favorite_ids: ids });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch favorites' });
        }
    });

    userRouter.post('/favorites', mockAuthMiddleware, async (req, res) => {
        if (!req.body.product_id) {
            return res.status(400).json({ error: 'product_id required' });
        }
        const result = await global.mockDb.query();
        res.json(result.rows[0]);
    });

    userRouter.delete('/favorites/:productId', mockAuthMiddleware, async (req, res) => {
        const result = await global.mockDb.query();
        res.json(result.rows[0]);
    });

    app.use('/api/user', userRouter);

    return app;
};

// Helper to generate test JWT
const generateTestToken = (userId = 1) => {
    return jwt.sign(
        { userId: userId, telegramId: userId, type: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
};

describe('User Routes', () => {
    let app;
    let authToken;

    beforeEach(() => {
        global.mockDb.reset();
        app = createTestApp();
        authToken = generateTestToken(12345);
    });

    describe('GET /api/user/profile', () => {
        it('returns 401 without auth token', async () => {
            const res = await request(app).get('/api/user/profile');
            expect(res.status).toBe(401);
        });

        it('returns user profile with valid token', async () => {
            global.mockDb.query.mockResolvedValueOnce({
                rows: [{
                    telegram_id: 12345,
                    full_name: 'Test User',
                    phone_number: '+963912345678',
                    selected_city_id: 1,
                    selected_city_name: 'Damascus'
                }]
            });

            const res = await request(app)
                .get('/api/user/profile')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.full_name).toBe('Test User');
        });
    });

    describe('GET /api/user/favorites', () => {
        it('returns user favorites', async () => {
            global.mockDb.query.mockResolvedValueOnce({
                rows: [{ favorite_product_ids: [1, 2, 3] }]
            });

            const res = await request(app)
                .get('/api/user/favorites')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.favorite_ids).toEqual([1, 2, 3]);
        });

        it('returns empty array when no favorites', async () => {
            global.mockDb.query.mockResolvedValueOnce({
                rows: [{ favorite_product_ids: null }]
            });

            const res = await request(app)
                .get('/api/user/favorites')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.favorite_ids).toEqual([]);
        });
    });

    describe('POST /api/user/favorites', () => {
        it('adds product to favorites', async () => {
            global.mockDb.query.mockResolvedValueOnce({
                rows: [{ favorite_product_ids: [1, 5] }]
            });

            const res = await request(app)
                .post('/api/user/favorites')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ product_id: 5 });

            expect(res.status).toBe(200);
        });

        it('returns 400 for missing product_id', async () => {
            const res = await request(app)
                .post('/api/user/favorites')
                .set('Authorization', `Bearer ${authToken}`)
                .send({});

            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /api/user/favorites/:productId', () => {
        it('removes product from favorites', async () => {
            global.mockDb.query.mockResolvedValueOnce({
                rows: [{ favorite_product_ids: [1] }]
            });

            const res = await request(app)
                .delete('/api/user/favorites/5')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
        });
    });
});
