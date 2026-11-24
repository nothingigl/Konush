import { ImageResponse } from 'next/og';

export const alt = 'Konuş! — Турецкий и английский на 4 навыках бесплатно';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px',
        background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0284c7 100%)',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '24px',
            background: '#ffffff',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '42px',
            fontWeight: 900,
          }}
        >
          K!
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '44px', fontWeight: 900, letterSpacing: '-0.02em' }}>
            Konuş!
          </span>
          <span style={{ fontSize: '20px', color: '#bae6fd', fontWeight: 600 }}>
            Бесплатный тренажёр турецкого и английского
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '980px' }}>
        <div style={{ fontSize: '58px', fontWeight: 900, lineHeight: 1.1 }}>
          133 юнита · 4 навыка · 0 ₽
        </div>
        <div style={{ fontSize: '28px', color: '#e0f2fe', lineHeight: 1.35 }}>
          Говорение, слушание, письмо и чтение с повторениями 1 → 3 → 7 → 14 дней и работой без
          интернета.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {['Говорение', 'Слушание', 'Письмо', 'Чтение', 'Офлайн PWA'].map((badge) => (
          <div
            key={badge}
            style={{
              padding: '12px 24px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.35)',
              fontSize: '22px',
              fontWeight: 700,
            }}
          >
            {badge}
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
