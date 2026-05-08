jest.mock('../../middleware/authUploader', () =>
  jest.fn((req, res, next) => {
    if (req.headers['x-deny']) {
      return res.status(401).json({ error: 'blocked' });
    }
    req.actor = { role: 'admin', payload: { adminId: 1 } };
    return next();
  })
);

jest.mock('../../services/storageService', () => ({
  createSignedUpload: jest.fn(),
}));

const express = require('express');
const request = require('../utils/request');
const authUploader = require('../../middleware/authUploader');
const { createSignedUpload } = require('../../services/storageService');
const storageRoutes = require('../../routes/storage');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/storage', storageRoutes);
  return app;
};

describe('Storage Routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    createSignedUpload.mockReset();
    authUploader.mockClear();
  });

  it('returns 401 when auth middleware blocks the request', async () => {
    const res = await request(app)
      .post('/api/storage/signed-upload')
      .set('x-deny', '1')
      .send({ filename: 'valid.png' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'blocked' });
    expect(createSignedUpload).not.toHaveBeenCalled();
  });

  it('validates filename format', async () => {
    const res = await request(app)
      .post('/api/storage/signed-upload')
      .send({ filename: 'bad/name.png' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(createSignedUpload).not.toHaveBeenCalled();
  });

  it('validates folder characters when provided', async () => {
    const res = await request(app)
      .post('/api/storage/signed-upload')
      .send({ filename: 'image.png', folder: 'bad folder with spaces' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(createSignedUpload).not.toHaveBeenCalled();
  });

  it('validates expiresIn bounds', async () => {
    const res = await request(app)
      .post('/api/storage/signed-upload')
      .send({ filename: 'image.png', expiresIn: 30 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(createSignedUpload).not.toHaveBeenCalled();
  });

  it('returns signed upload payload on success', async () => {
    createSignedUpload.mockResolvedValueOnce({
      bucket: 'product-images',
      path: 'uploads/2026-01-15/image-1.png',
      signedUrl: 'https://signed.example/upload',
      publicUrl: 'https://public.example/image-1.png',
      expiresIn: 600,
    });

    const res = await request(app)
      .post('/api/storage/signed-upload')
      .send({
        filename: 'image.png',
        folder: 'uploads',
        bucket: 'product-images',
        expiresIn: 600,
      });

    expect(res.status).toBe(200);
    expect(createSignedUpload).toHaveBeenCalledWith({
      filename: 'image.png',
      folder: 'uploads',
      bucket: 'product-images',
      expiresIn: 600,
    });
    expect(res.body).toEqual({
      bucket: 'product-images',
      path: 'uploads/2026-01-15/image-1.png',
      signedUrl: 'https://signed.example/upload',
      publicUrl: 'https://public.example/image-1.png',
      expiresIn: 600,
    });
  });

  it('returns 500 when storage service fails', async () => {
    createSignedUpload.mockRejectedValueOnce(new Error('storage unavailable'));

    const res = await request(app)
      .post('/api/storage/signed-upload')
      .send({ filename: 'image.png' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to create signed upload URL' });
  });
});
