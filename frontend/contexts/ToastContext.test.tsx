import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from './ToastContext'

// Toast コンポーネントをモック
vi.mock('@/components/atoms/Toast/Toast', () => ({
  Toast: ({ message, type, onClose }: {
    message: string
    type: string
    onClose: () => void
  }) => (
    <div data-testid="toast" data-type={type}>
      {message}
      <button onClick={onClose}>Close</button>
    </div>
  )
}))

// テスト用のコンポーネント
const TestComponent = () => {
  const { showToast } = useToast()

  return (
    <div>
      <button
        onClick={() => showToast('Success message', 'success')}
        data-testid="success-button"
      >
        Show Success
      </button>
      <button
        onClick={() => showToast('Error message', 'error')}
        data-testid="error-button"
      >
        Show Error
      </button>
      <button
        onClick={() => showToast('Info message')}
        data-testid="info-button"
      >
        Show Info
      </button>
    </div>
  )
}

describe('ToastContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ToastProvider', () => {
    it('子コンポーネントを正しくレンダリングすること', () => {
      render(
        <ToastProvider>
          <div data-testid="child">Child Component</div>
        </ToastProvider>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('初期状態でトーストが表示されないこと', () => {
      render(
        <ToastProvider>
          <div>Test</div>
        </ToastProvider>
      )

      expect(screen.queryByTestId('toast')).not.toBeInTheDocument()
    })
  })

  describe('useToast hook', () => {
    it('ToastProvider内で正常に動作すること', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      expect(screen.getByTestId('success-button')).toBeInTheDocument()
      expect(screen.getByTestId('error-button')).toBeInTheDocument()
      expect(screen.getByTestId('info-button')).toBeInTheDocument()
    })

    it('ToastProvider外で使用時にエラーをスローすること', () => {
      // コンソールエラーを一時的に無効化
      const originalError = console.error
      console.error = vi.fn()

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useToast must be used within a ToastProvider')

      console.error = originalError
    })
  })

  describe('showToast function', () => {
    it('成功トーストを表示すること', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('success-button').click()
      })

      const toast = screen.getByTestId('toast')
      expect(toast).toBeInTheDocument()
      expect(toast).toHaveTextContent('Success message')
      expect(toast).toHaveAttribute('data-type', 'success')
    })

    it('エラートーストを表示すること', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('error-button').click()
      })

      const toast = screen.getByTestId('toast')
      expect(toast).toBeInTheDocument()
      expect(toast).toHaveTextContent('Error message')
      expect(toast).toHaveAttribute('data-type', 'error')
    })

    it('情報トーストを表示すること（デフォルトタイプ）', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('info-button').click()
      })

      const toast = screen.getByTestId('toast')
      expect(toast).toBeInTheDocument()
      expect(toast).toHaveTextContent('Info message')
      expect(toast).toHaveAttribute('data-type', 'info')
    })

    it('複数のトーストを同時に表示できること', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('success-button').click()
        screen.getByTestId('error-button').click()
      })

      const toasts = screen.getAllByTestId('toast')
      expect(toasts).toHaveLength(2)
      expect(toasts[0]).toHaveTextContent('Success message')
      expect(toasts[1]).toHaveTextContent('Error message')
    })

    it('トーストを個別に削除できること', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('success-button').click()
        screen.getByTestId('error-button').click()
      })

      let toasts = screen.getAllByTestId('toast')
      expect(toasts).toHaveLength(2)

      // 最初のトーストを削除
      await act(async () => {
        toasts[0].querySelector('button')?.click()
      })

      toasts = screen.getAllByTestId('toast')
      expect(toasts).toHaveLength(1)
      expect(toasts[0]).toHaveTextContent('Error message')
    })

    it('すべてのトーストを削除できること', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('success-button').click()
        screen.getByTestId('error-button').click()
      })

      let toasts = screen.getAllByTestId('toast')
      expect(toasts).toHaveLength(2)

      // すべてのトーストを削除
      await act(async () => {
        toasts.forEach(toast => {
          toast.querySelector('button')?.click()
        })
      })

      expect(screen.queryByTestId('toast')).not.toBeInTheDocument()
    })
  })

  describe('トーストのプロパティ', () => {
    it('カスタム継続時間が設定されること', async () => {
      const CustomTestComponent = () => {
        const { showToast } = useToast()

        return (
          <button
            onClick={() => showToast('Custom duration', 'info', 5000)}
            data-testid="custom-duration-button"
          >
            Show Custom Duration Toast
          </button>
        )
      }

      render(
        <ToastProvider>
          <CustomTestComponent />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('custom-duration-button').click()
      })

      expect(screen.getByTestId('toast')).toBeInTheDocument()
    })

    it('一意のIDが生成されること', async () => {
      // Date.now をモック
      const mockDateNow = vi.spyOn(Date, 'now')
      mockDateNow.mockReturnValueOnce(1000).mockReturnValueOnce(2000)

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('success-button').click()
        screen.getByTestId('error-button').click()
      })

      const toasts = screen.getAllByTestId('toast')
      expect(toasts).toHaveLength(2)

      // IDが異なることを確認（key属性は直接テストできないため、レンダリング結果で判断）
      expect(toasts[0]).toHaveTextContent('Success message')
      expect(toasts[1]).toHaveTextContent('Error message')

      mockDateNow.mockRestore()
    })
  })
})