import Link from 'next/link'

export default function Home() {
  return (
    <div className="container" style={{ 
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <header style={{
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold',
          color: 'var(--text-color)'
        }}>
          AikiNote
        </h1>
        <p style={{
          fontSize: '1.2rem',
          color: 'var(--text-light)',
          marginTop: '0.5rem'
        }}>
          合気道の稽古を記録し、共有するアプリケーション
        </p>
      </header>

      <main style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <section style={{
          background: 'var(--background-light)',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            marginBottom: '1rem',
            fontWeight: '600'
          }}>
            稽古の記録を始めましょう
          </h2>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <Link href="/personal" style={{
              display: 'block',
              background: 'var(--primary-color)',
              color: 'white',
              padding: '1rem',
              borderRadius: '0.25rem',
              textAlign: 'center',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}>
              個人の稽古記録を始める
            </Link>
            
            <Link href="/community" style={{
              display: 'block',
              background: 'white',
              border: '1px solid var(--primary-color)',
              color: 'var(--primary-color)',
              padding: '1rem',
              borderRadius: '0.25rem',
              textAlign: 'center',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}>
              みんなの稽古記録を見る
            </Link>
          </div>
        </section>
        
        <section style={{
          margin: '2rem 0',
          padding: '1rem',
          borderRadius: '0.5rem'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            marginBottom: '1rem',
            fontWeight: '600'
          }}>
            AikiNoteの特徴
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginTop: '1.5rem'
          }}>
            <div style={{
              padding: '1.5rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{
                fontSize: '1.2rem',
                marginBottom: '0.5rem',
                fontWeight: '600'
              }}>
                稽古記録
              </h3>
              <p style={{
                color: 'var(--text-light)'
              }}>
                稽古の内容、感想、学んだ技などを記録できます
              </p>
            </div>
            
            <div style={{
              padding: '1.5rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{
                fontSize: '1.2rem',
                marginBottom: '0.5rem',
                fontWeight: '600'
              }}>
                共有と交流
              </h3>
              <p style={{
                color: 'var(--text-light)'
              }}>
                仲間と稽古記録を共有し、コメントやいいねでコミュニケーション
              </p>
            </div>
            
            <div style={{
              padding: '1.5rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{
                fontSize: '1.2rem',
                marginBottom: '0.5rem',
                fontWeight: '600'
              }}>
                成長の記録
              </h3>
              <p style={{
                color: 'var(--text-light)'
              }}>
                稽古の積み重ねを可視化し、合気道の上達を実感できます
              </p>
            </div>
          </div>
        </section>
      </main>
      
      <footer style={{
        marginTop: '2rem',
        textAlign: 'center',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '1rem',
        color: 'var(--text-light)',
        fontSize: '0.9rem'
      }}>
        <p>© 2025 AikiNote</p>
      </footer>
    </div>
  )
}