import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchApi, getDojos, getUsers, testSupabaseConnection } from './api'

// Fetch APIをモック
global.fetch = vi.fn()

describe('API Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // デフォルトのレスポンスを設定
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [] }),
    } as Response)
  })

  describe('fetchApi', () => {
    it('成功時に正しいデータを返すこと', async () => {
      const mockData = { id: 1, name: 'test' }
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      } as Response)

      const result = await fetchApi('/test')

      expect(result.data).toEqual(mockData)
      expect(result.error).toBeNull()
    })

    it('APIエラー時にエラーオブジェクトを返すこと', async () => {
      const errorMessage = 'API Error'
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: errorMessage }),
      } as Response)

      const result = await fetchApi('/test')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe(errorMessage)
    })

    it('ネットワークエラー時にエラーオブジェクトを返すこと', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const result = await fetchApi('/test')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Network error')
    })

    it('POSTリクエスト時に正しいボディを送信すること', async () => {
      const requestBody = { name: 'test' }

      await fetchApi('/test', {
        method: 'POST',
        body: requestBody,
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8787/test',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        })
      )
    })

    it('正しいURLを構築すること', async () => {
      // スラッシュなしのエンドポイント
      await fetchApi('test')
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8787/test',
        expect.any(Object)
      )

      // スラッシュありのエンドポイント
      await fetchApi('/test')
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8787/test',
        expect.any(Object)
      )
    })
  })

  describe('getDojos', () => {
    it('道場一覧を取得すること', async () => {
      const mockDojos = [
        {
          id: '1',
          name: 'Test Dojo',
          style: 'Aikido',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
        },
      ]

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockDojos,
      } as Response)

      const result = await getDojos()

      expect(result.data).toEqual(mockDojos)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/dojo',
        expect.any(Object)
      )
    })
  })

  describe('getUsers', () => {
    it('ユーザー一覧を取得すること', async () => {
      const mockUsers = [
        {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          profile_image_url: null,
          dojo_id: null,
          training_start_date: null,
          publicity_setting: 'public',
          language: 'ja',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
        },
      ]

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockUsers,
      } as Response)

      const result = await getUsers()

      expect(result.data).toEqual(mockUsers)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/users',
        expect.any(Object)
      )
    })
  })

  describe('testSupabaseConnection', () => {
    it('Supabase接続テストを実行すること', async () => {
      const mockResponse = {
        success: true,
        message: 'Connection successful',
        serverTime: '2023-01-01T00:00:00Z',
        timestamp: '2023-01-01T00:00:00Z',
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response)

      const result = await testSupabaseConnection()

      expect(result.data).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/supabase-test',
        expect.any(Object)
      )
    })
  })
})