export default function PageLoadingSkeleton({ title = '' }) {
  return (
    <>
      {/* Hero skeleton */}
      <section style={{
        position: 'relative',
        height: '50vh',
        minHeight: '350px',
        background: '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <div style={{ textAlign: 'center', zIndex: 2 }}>
          <div style={{ width: '100px', height: '14px', background: 'rgba(240,199,94,0.15)', borderRadius: '4px', margin: '0 auto 1rem' }}></div>
          <div style={{ width: '350px', maxWidth: '80vw', height: '44px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', margin: '0 auto 0.75rem' }}></div>
          <div style={{ width: '450px', maxWidth: '90vw', height: '18px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', margin: '0 auto' }}></div>
        </div>
      </section>

      {/* Content skeleton */}
      <section style={{ padding: '4rem 0', background: 'var(--color-bg, #FFF9EF)' }}>
        <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ width: '60%', height: '28px', background: 'rgba(26,26,26,0.06)', borderRadius: '6px' }}></div>
              <div style={{ width: '40px', height: '3px', background: 'rgba(240,199,94,0.3)', borderRadius: '2px' }}></div>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ width: `${90 - i * 10}%`, height: '16px', background: 'rgba(26,26,26,0.04)', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }}></div>
              ))}
            </div>
            <div style={{ height: '350px', background: 'rgba(26,26,26,0.04)', borderRadius: '12px', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
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
