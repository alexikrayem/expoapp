import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '../../api/apiClient'

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockClear()
  })

  it('sends correct headers in development mode', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })

    await apiClient('test-endpoint')

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/test-endpoint',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Dev-Bypass-Auth': 'true'
        })
      })
    )
  })

  it('sends Telegram init data when available', async () => {
    // Mock Telegram data
    global.Telegram.WebApp.initData = 'mock_telegram_data'
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })

    await apiClient('test-endpoint')

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/test-endpoint',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Telegram-Init-Data': 'mock_telegram_data'
        })
      })
    )
  })

  it('handles POST requests correctly', async () => {
    const testData = { name: 'test' }
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })

    await apiClient('test-endpoint', { 
      method: 'POST',
      body: testData 
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/test-endpoint',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(testData)
      })
    )
  })

  it('handles API errors correctly', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Bad request' })
    })

    await expect(apiClient('test-endpoint')).rejects.toEqual(
      expect.objectContaining({
        message: 'Bad request',
        status: 400
      })
    )
  })

  it('handles network errors', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    await expect(apiClient('test-endpoint')).rejects.toEqual(
      expect.objectContaining({
        message: 'Network error'
      })
    )
  })
})