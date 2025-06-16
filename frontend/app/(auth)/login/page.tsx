'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { signIn } from '@/lib/auth'
import styles from './login.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await signIn({ email, password })
      
      if (error) {
        throw error
      }
      
      // ログイン成功
      router.push('/mypage')
    } catch (err) {
      console.error('Login error:', err)
      setError('ログインに失敗しました。メールアドレスとパスワードをご確認ください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.authContainer}>
      <h1 className={styles.title}>AikiNote</h1>
      
      <div className={styles.card}>
        <h2 className={styles.subtitle}>ログイン</h2>
        
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label 
              htmlFor="email" 
              className={styles.label}
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.input}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label 
              htmlFor="password" 
              className={styles.label}
            >
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
        
        <div className={styles.footer}>
          アカウントをお持ちでない方は
          <Link 
            href="/signup" 
            className={styles.link}
          >
            新規登録
          </Link>
        </div>
      </div>
    </div>
  )
}