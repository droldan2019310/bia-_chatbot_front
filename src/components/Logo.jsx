import React from 'react';

// BIA+ logo mark — re-creates the arc + wordmark from the brief.
// Uses the four logo colors: purple, magenta, yellow, soft pink.

import evyImg from '../assets/pasted-1779458827268-0.png';

export function BiaArc({ size = 96, spinning = false, withWordmark = false }) {
  const s = size;
  return (
    <span className={`logo-arc-wrap ${spinning ? 'spinning' : ''}`} style={{ width: s, height: s, display: 'inline-block' }}>
      <img src={evyImg} alt="Evy Robot" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
