const crypto = require('crypto');

const buildSupabaseClient = ({
  signedUploadResult = {
    data: {
      path: 'uploads/resolved.png',
      signedUrl: 'https://signed.example/upload',
    },
    error: null,
  },
  publicUrl = 'https://public.example/uploads/resolved.png',
} = {}) => {
  const createSignedUploadUrl = jest.fn().mockResolvedValue(signedUploadResult);
  const getPublicUrl = jest.fn(() => ({ data: { publicUrl } }));
  const from = jest.fn(() => ({
    createSignedUploadUrl,
    getPublicUrl,
  }));

  const client = {
    storage: { from },
  };

  return {
    client,
    createSignedUploadUrl,
    getPublicUrl,
    from,
  };
};

const loadStorageService = ({ configured = true, client = null, logger } = {}) => {
  jest.resetModules();

  const isSupabaseConfigured = jest.fn(() => configured);
  const getSupabaseClient = jest.fn(() => client);

  jest.doMock('../../config/supabase', () => ({
    isSupabaseConfigured,
    getSupabaseClient,
  }));
  jest.doMock('../../services/logger', () => logger);

  const storageService = require('../../services/storageService');
  return { storageService, isSupabaseConfigured, getSupabaseClient };
};

describe('storageService', () => {
  const originalEnv = process.env;
  let logger;

  beforeEach(() => {
    process.env = { ...originalEnv };
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      request: jest.fn(),
      query: jest.fn(),
    };
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('throws when filename is missing', async () => {
    const { client } = buildSupabaseClient();
    const { storageService } = loadStorageService({ configured: true, client, logger });

    await expect(storageService.createSignedUpload({})).rejects.toThrow(
      'Filename is required for signed upload.'
    );
  });

  it('throws when Supabase storage is not configured', async () => {
    const { storageService } = loadStorageService({ configured: false, client: null, logger });

    await expect(
      storageService.createSignedUpload({ filename: 'test.png' })
    ).rejects.toThrow('Supabase storage is not configured.');
  });

  it('throws when Supabase client is unavailable', async () => {
    const { storageService } = loadStorageService({ configured: true, client: null, logger });

    await expect(
      storageService.createSignedUpload({ filename: 'test.png' })
    ).rejects.toThrow('Supabase client unavailable.');
  });

  it('creates signed upload URL with sanitized path and resolved public url', async () => {
    const { client, createSignedUploadUrl, getPublicUrl, from } = buildSupabaseClient({
      signedUploadResult: {
        data: {
          path: 'final/path.png',
          signedUrl: 'https://signed.example/final',
        },
        error: null,
      },
      publicUrl: 'https://public.example/final/path.png',
    });

    process.env.SUPABASE_STORAGE_BUCKET = 'custom-bucket';
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('uuid-123');

    const { storageService } = loadStorageService({ configured: true, client, logger });
    const result = await storageService.createSignedUpload({
      filename: 'My File.PNG',
      folder: '/Images Folder//',
      expiresIn: 300,
    });

    expect(createSignedUploadUrl).toHaveBeenCalledWith(
      'ImagesFolder/2026-01-15/my_file-uuid-123.png',
      300
    );
    expect(from).toHaveBeenCalledWith('custom-bucket');
    expect(getPublicUrl).toHaveBeenCalledWith('final/path.png');
    expect(result).toEqual({
      bucket: 'custom-bucket',
      path: 'final/path.png',
      signedUrl: 'https://signed.example/final',
      publicUrl: 'https://public.example/final/path.png',
      expiresIn: 300,
    });
  });

  it('falls back to generated object path when Supabase response omits path', async () => {
    const { client, createSignedUploadUrl, getPublicUrl } = buildSupabaseClient({
      signedUploadResult: {
        data: {
          signedUrl: 'https://signed.example/fallback',
        },
        error: null,
      },
      publicUrl: 'https://public.example/generated.png',
    });
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('uuid-456');

    const { storageService } = loadStorageService({ configured: true, client, logger });
    const result = await storageService.createSignedUpload({
      filename: 'report.pdf',
      folder: 'uploads',
      expiresIn: 900,
    });

    const generatedPath = 'uploads/2026-01-15/report-uuid-456.pdf';
    expect(createSignedUploadUrl).toHaveBeenCalledWith(generatedPath, 900);
    expect(getPublicUrl).toHaveBeenCalledWith(generatedPath);
    expect(result.path).toBe(generatedPath);
  });

  it('logs and rethrows storage provider errors when signed upload creation fails', async () => {
    const supabaseError = new Error('supabase failure');
    const { client } = buildSupabaseClient({
      signedUploadResult: {
        data: null,
        error: supabaseError,
      },
    });
    const { storageService } = loadStorageService({ configured: true, client, logger });

    await expect(
      storageService.createSignedUpload({ filename: 'photo.jpg' })
    ).rejects.toThrow('supabase failure');

    expect(logger.error).toHaveBeenCalledWith(
      'Supabase signed upload URL failed',
      supabaseError
    );
  });

  it('returns public object urls through getPublicUrl helper', () => {
    const { client, getPublicUrl, from } = buildSupabaseClient({
      publicUrl: 'https://public.example/my-file.jpg',
    });
    const { storageService } = loadStorageService({ configured: true, client, logger });

    const url = storageService.getPublicUrl({
      bucket: 'my-bucket',
      path: 'images/my-file.jpg',
    });

    expect(from).toHaveBeenCalledWith('my-bucket');
    expect(getPublicUrl).toHaveBeenCalledWith('images/my-file.jpg');
    expect(url).toBe('https://public.example/my-file.jpg');
  });
});
