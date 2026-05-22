import React from 'react';

// BIA+ logo mark — re-creates the arc + wordmark from the brief.
// Uses the four logo colors: purple, magenta, yellow, soft pink.

export function BiaArc({ size = 96, spinning = true, withWordmark = false }) {
  const s = size;
  // Stroke segments arranged around a circle. The reference logo has 4 arc
  // segments offset around the circumference, so we render 4 dashed strokes
  // each rotated independently.
  const segments = [
    { color: '#FFD60A', from: 200, len: 70  }, // yellow top
    { color: '#F8C6DE', from: 195, len: 60  }, // pink top-left (overlap)
    { color: '#A855D9', from: 260, len: 95  }, // purple left
    { color: '#FFD60A', from: 95,  len: 60  }, // yellow bottom
    { color: '#A855D9', from: 0,   len: 80  }, // purple bottom-right
    { color: '#F8C6DE', from: 285, len: 28  }, // pink small
  ];
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <span className="logo-arc-wrap" style={{ width: s, height: s, display: 'inline-block' }}>
      <svg className={spinning ? 'spinning' : ''} viewBox="0 0 100 100" width={s} height={s}
           style={{ display: 'block', overflow: 'visible' }}>
        {segments.map((seg, i) => {
          const dash = (seg.len / 360) * c;
          const gap  = c - dash;
          const offset = -((seg.from) / 360) * c;
          return (
            <circle key={i} cx="50" cy="50" r={r} fill="none"
                    stroke={seg.color} strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={`${dash} ${gap}`}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 50 50)`} />
          );
        })}
      </svg>
    </span>
  );
}

// Logo mark + wordmark "BIA+"
export function BiaLogo({ size = 32, color = 'var(--purple-700)', plusColor = '#E0319A', tagline = false }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <BiaArc size={size} spinning={false} />
      <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontFamily: 'Manrope', fontWeight: 800, fontSize: size * 0.72,
          letterSpacing: '-0.02em', color
        }}>
          BIA<span style={{ color: plusColor }}>+</span>
        </span>
        {tagline && (
          <span style={{
            fontSize: size * 0.18, marginTop: 4, color: 'var(--ink-500)',
            letterSpacing: '0.14em', fontWeight: 600, textTransform: 'uppercase'
          }}>
            Actualizamos para optimizarnos
          </span>
        )}
      </span>
    </span>
  );
}
