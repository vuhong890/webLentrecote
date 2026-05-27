import styles from './page.module.css';

export default function HomeLoading() {
  return (
    <>
      {/* Hero skeleton */}
      <section className={styles.hero} style={{ background: '#1a1a1a' }}>
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <div style={{ width: '180px', height: '16px', background: 'rgba(240,199,94,0.15)', borderRadius: '4px', margin: '0 auto 1rem' }}></div>
          <div style={{ width: '400px', maxWidth: '80%', height: '48px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', margin: '0 auto 1rem' }}></div>
          <div style={{ width: '500px', maxWidth: '90%', height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', margin: '0 auto' }}></div>
        </div>
      </section>

      {/* Content skeleton */}
      <section style={{ padding: '5rem 0', background: 'var(--color-bg)' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '120px', height: '14px', background: 'rgba(240,199,94,0.12)', borderRadius: '4px' }}></div>
          <div style={{ width: '300px', height: '36px', background: 'rgba(26,26,26,0.06)', borderRadius: '6px' }}></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem', width: '100%', marginTop: '2rem' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: '320px', background: 'rgba(26,26,26,0.04)', borderRadius: '12px', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.15}s` }}></div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}
