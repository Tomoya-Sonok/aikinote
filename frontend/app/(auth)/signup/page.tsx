"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { signUp } from "@/lib/server/auth";
import { getDojos } from "@/lib/server/api";
import styles from "./signup.module.css";

// 道場の型定義を追加
type Dojo = {
  id: string;
  name: string;
  style: string;
  created_at: string;
  updated_at: string;
};

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [dojoId, setDojoId] = useState("");
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingDojos, setFetchingDojos] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 道場一覧を取得
    const fetchDojos = async () => {
      try {
        const { data, error } = await getDojos();
        if (error) throw error;
        if (data) setDojos(data);
      } catch (err) {
        console.error("Failed to fetch dojos:", err);
      } finally {
        setFetchingDojos(false);
      }
    };

    fetchDojos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 入力検証
    if (password !== confirmPassword) {
      setError("パスワードが一致していません");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: _data, error } = await signUp({
        email,
        password,
        username,
        dojoId: dojoId || undefined,
      });

      if (error) {
        throw error;
      }

      // 登録成功
      alert(
        "登録が完了しました！メールを確認してアカウントを有効化してください。",
      );
      router.push("/login");
    } catch (err: unknown) {
      console.error("Signup error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "登録に失敗しました。もう一度お試しください。",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <h1 className={styles.title}>AikiNote</h1>

      <div className={styles.card}>
        <h2 className={styles.subtitle}>新規登録</h2>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
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
            <label htmlFor="username" className={styles.label}>
              ユーザー名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="dojo" className={styles.label}>
              所属道場（任意）
            </label>
            <select
              id="dojo"
              value={dojoId}
              onChange={(e) => setDojoId(e.target.value)}
              className={styles.select}
            >
              <option value="">選択してください</option>
              {fetchingDojos ? (
                <option disabled>読み込み中...</option>
              ) : (
                dojos.map((dojo) => (
                  <option key={dojo.id} value={dojo.id}>
                    {dojo.name} ({dojo.style})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              パスワード（確認）
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? "登録中..." : "登録する"}
          </button>
        </form>

        <div className={styles.footer}>
          すでにアカウントをお持ちの方は
          <Link href="/login" className={styles.link}>
            ログイン
          </Link>
        </div>
      </div>
    </div>
  );
}
