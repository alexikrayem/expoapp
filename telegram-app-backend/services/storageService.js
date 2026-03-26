// services/storageService.js
// Supabase Storage helpers (signed upload + public URL).

const crypto = require('crypto');
const path = require('path');
const { getSupabaseClient, isSupabaseConfigured } = require('../config/supabase');
const logger = require('./logger');

const DEFAULT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';
const DEFAULT_SIGNED_TTL_SECONDS = Number(process.env.SUPABASE_SIGNED_URL_TTL || 900);

const sanitizeSegment = (value) => value.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/\/+/g, '/');

const sanitizeFilename = (filename) => filename.replace(/[^\w.\-]+/g, '_').toLowerCase();

const buildObjectPath = ({ folder, filename }) => {
  const safeFolder = folder ? sanitizeSegment(folder).replace(/^\/|\/$/g, '') : 'uploads';
  const safeName = sanitizeFilename(filename);
  const ext = path.extname(safeName);
  const base = path.basename(safeName, ext);
  const stamp = new Date().toISOString().slice(0, 10);
  const uniqueId = crypto.randomUUID();
  const finalName = ext ? `${base}-${uniqueId}${ext}` : `${base}-${uniqueId}`;
  return `${safeFolder}/${stamp}/${finalName}`;
};

const ensureSupabase = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase storage is not configured.');
  }
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client unavailable.');
  }
  return client;
};

const createSignedUpload = async ({ bucket = DEFAULT_BUCKET, folder, filename, expiresIn = DEFAULT_SIGNED_TTL_SECONDS }) => {
  if (!filename) {
    throw new Error('Filename is required for signed upload.');
  }

  const client = ensureSupabase();
  const objectPath = buildObjectPath({ folder, filename });

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUploadUrl(objectPath, expiresIn);

  if (error) {
    logger.error('Supabase signed upload URL failed', error);
    throw error;
  }

  const resolvedPath = data?.path || objectPath;
  const publicUrl = client.storage.from(bucket).getPublicUrl(resolvedPath).data?.publicUrl;

  return {
    bucket,
    path: resolvedPath,
    signedUrl: data?.signedUrl,
    publicUrl,
    expiresIn,
  };
};

const getPublicUrl = ({ bucket = DEFAULT_BUCKET, path: objectPath }) => {
  const client = ensureSupabase();
  return client.storage.from(bucket).getPublicUrl(objectPath).data?.publicUrl;
};

module.exports = {
  createSignedUpload,
  getPublicUrl,
};
