import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { sendChatMessage } from './services/chatService';
import { TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakToggle, useTweaks } from './components/TweaksPanel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import eviLogo from './assets/evi-logo.png';
import evyPie from './assets/evy-pie.png';

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "blue",
  "density": "comfy",
  "showSuggestions": true,
  "rotateLogo": false,
  "headerStyle": "minimal"
}/*EDITMODE-END*/;

// ── BIA+ knowledge — fed into Claude as system prompt ─────────────────────
const BIA_SYSTEM = `Eres Evy, la asistente virtual oficial del proyecto BIA+.
BIA+ es un equipo cuyo lema es "ACTUALIZAMOS PARA OPTIMIZARNOS". El equipo
está presentando su propuesta a sponsors y jueces y este chatbot existe
para que ellos puedan explorar la solución con calma fuera de las
presentaciones en vivo.

Información clave del proyecto:
- Hay dos soluciones tecnológicas evaluadas para este chatbot: Chatbase
  (no-code, $0–$138/mes, con branding de terceros) y un Artifact Shareable
  custom con la API de Claude (~$5 USD totales, sin branding de terceros,
  mensajes ilimitados dentro del crédito disponible).
- El equipo recomienda el Artifact Shareable porque el costo es casi cero,
  es 100% branding de BIA+, y se puede tener listo el mismo día.
- Puedes responder sobre la comparativa, los costos, los próximos pasos,
  el setup técnico, las ventajas y desventajas de cada opción.

Estilo:
- Responde en español, en tono profesional pero cálido.
- Sé conciso. Máximo 3-4 párrafos cortos. Usa listas cuando ayuden.
- Si no sabes algo específico de BIA+, dilo y sugiere contactar al equipo.
- No inventes cifras nuevas; usa solo las del documento de propuesta.`;

const SUGGESTIONS = [
  { icon: '◆', label: '¿Qué problema resuelve BIA+?', prompt: '¿Qué problema resuelve BIA+ y a quién va dirigido?' },
  { icon: '✦', label: 'Comparar Chatbase vs Artifact', prompt: 'Hazme una comparativa rápida entre Chatbase y el Artifact Shareable.' },
  { icon: '✚', label: '¿Cuánto cuesta cada opción?', prompt: '¿Cuánto cuesta mensualmente cada una de las dos opciones?' },
  { icon: '↗', label: 'Próximos pasos para el equipo', prompt: '¿Cuáles son los próximos pasos que debe tomar el equipo?' },
];

const ACCENTS = {
  blue:    { name:'Azul',    solid:'#00B4D8', soft:'#E0FBFC', deep:'#0077B6' },
  magenta: { name:'Magenta', solid:'#E0319A', soft:'#FCE4EF', deep:'#C42A86' },
  purple:  { name:'Morado',  solid:'#A855D9', soft:'#F0DEFA', deep:'#5B1E82' },
  yellow:  { name:'Amarillo',solid:'#F0B100', soft:'#FFF4B8', deep:'#8A6500' },
};

// ── helpers ───────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2,9); }

function relTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const accent = ACCENTS[t.accent] || ACCENTS.magenta;

  // theme on body
  useEffect(() => {
    document.body.classList.toggle('dark', t.theme === 'dark');
    document.documentElement.style.setProperty('--accent-solid', accent.solid);
    document.documentElement.style.setProperty('--accent-soft', accent.soft);
    document.documentElement.style.setProperty('--accent-deep', accent.deep);
  }, [t.theme, t.accent]);

  const [messages, setMessages] = useState([]); // {id,role,content,ts,error?}
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollerRef = useRef(null);
  const inputRef = useRef(null);

  const started = messages.length > 0;

  // auto-scroll
  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput('');
    const userMsg = { id: uid(), role: 'user', content, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setBusy(true);

    try {
      // Formateamos el historial al estilo esperado por el backend proxy
      // role: 'user' o 'model', parts: [{ text: "..." }]
      const formattedHistory = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const reply = await sendChatMessage(content, formattedHistory, BIA_SYSTEM);
      
      setMessages(m => [...m, { id: uid(), role: 'assistant', content: reply, ts: Date.now() }]);
    } catch (e) {
      setMessages(m => [...m, {
        id: uid(), role: 'assistant', error: true, ts: Date.now(),
        content: e.message || 'No pude completar la respuesta. Vuelve a intentar en un momento.'
      }]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }

  function reset() {
    setMessages([]);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  const pad = t.density === 'compact' ? 14 : t.density === 'comfy' ? 22 : 18;

  return (
    <div style={{
      position:'relative', zIndex:2, minHeight:'100vh',
      display:'flex', flexDirection:'column'
    }}>
      <Header t={t} onReset={reset} hasChat={started} accent={accent} />

      <main style={{
        flex:1, display:'flex', justifyContent:'center', padding:'0 24px 24px',
        position:'relative'
      }}>
        <div style={{
          width:'100%', maxWidth: started ? 820 : 920, display:'flex',
          flexDirection:'column', minHeight:0
        }}>
          {!started
            ? <Welcome accent={accent} t={t} onPick={(p) => send(p)} />
            : <ChatView messages={messages} busy={busy} scrollerRef={scrollerRef}
                       accent={accent} density={t.density} />}
        </div>
      </main>

      <Composer
        input={input} setInput={setInput}
        onSend={() => send()} busy={busy}
        accent={accent} started={started}
        inputRef={inputRef}
      />

      <Tweaks t={t} setTweak={setTweak} />
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────
function Header({ t, onReset, hasChat, accent }) {
  return (
    <header style={{
      position:'sticky', top:0, zIndex:5,
      backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)',
      background: t.theme === 'dark' ? 'rgba(15,5,24,.72)' : 'rgba(251,248,253,.78)',
      borderBottom:'1px solid var(--line)',
      padding:'14px 28px', display:'flex', alignItems:'center', justifyContent:'space-between'
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <span style={{ display:'inline-flex' }}>
          <img src={eviLogo} alt="Evy Logo" style={{ height: 38, objectFit: 'contain' }} />
        </span>
        <div style={{ display:'flex', flexDirection:'column', lineHeight:1.05 }}>
          <span style={{
            fontWeight:800, fontSize:20, letterSpacing:'-0.02em',
            color:'var(--ink-900)'
          }}>
            BIA<span style={{ color: accent.solid }}>+</span>
            <span style={{ fontWeight:500, color:'var(--ink-500)', marginLeft:10, fontSize:13 }}>
              Evy
            </span>
          </span>
          {t.headerStyle === 'full' && (
            <span style={{
              fontSize:10.5, marginTop:4, color:'var(--ink-500)',
              letterSpacing:'.16em', fontWeight:700, textTransform:'uppercase'
            }}>
              Actualizamos para optimizarnos
            </span>
          )}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <StatusPill accent={accent} />
        {hasChat && (
          <button onClick={onReset}
            className="focus-ring"
            style={{
              border:'1px solid var(--line-strong)', background:'transparent',
              color:'var(--ink-700)', padding:'8px 14px', borderRadius:999,
              fontSize:13, fontWeight:600, cursor:'pointer',
              display:'inline-flex', alignItems:'center', gap:6
            }}>
            <span style={{fontSize:14, lineHeight:1}}>↻</span> Nueva conversación
          </button>
        )}
      </div>
    </header>
  );
}

function StatusPill({ accent }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:8,
      padding:'6px 12px 6px 10px', borderRadius:999,
      background: 'color-mix(in oklab, ' + accent.solid + ' 12%, transparent)',
      border: '1px solid color-mix(in oklab, ' + accent.solid + ' 30%, transparent)',
      fontSize:12, fontWeight:600, color: accent.deep,
    }}>
      <span style={{
        width:7, height:7, borderRadius:'50%', background:accent.solid,
        boxShadow:'0 0 0 3px color-mix(in oklab,' + accent.solid + ' 28%, transparent)'
      }}/>
      En línea · Powered by AI
    </span>
  );
}

// ── Welcome ───────────────────────────────────────────────────────────────
function Welcome({ accent, t, onPick }) {
  return (
    <div style={{
      flex:1, display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', textAlign:'center', padding:'48px 12px',
      gap:32
    }}>
      <div style={{ position:'relative' }}>
        <img src={evyPie} alt="Evy" style={{ height: 260, objectFit: 'contain' }} />
      </div>

      <div style={{ maxWidth:560, display:'flex', flexDirection:'column', gap:14 }}>
        <h1 style={{
          margin:0, fontSize:34, fontWeight:700, letterSpacing:'-0.025em',
          color:'var(--ink-900)', textWrap:'balance'
        }}>
          Hola — soy <span style={{
            background:`linear-gradient(120deg, ${accent.solid} 0%, var(--blue-500) 70%)`,
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            backgroundClip:'text'
          }}>Evy</span>
        </h1>
        <p style={{
          margin:0, fontSize:16, lineHeight:1.55, color:'var(--ink-500)',
          textWrap:'pretty'
        }}>
          Pregúntame lo que quieras saber sobre la propuesta de BIA+,
          el comparativo de soluciones y los próximos pasos. Respondo en segundos.
        </p>
      </div>

      {t.showSuggestions && (
        <div style={{
          display:'grid', gap:10,
          gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))',
          width:'100%', maxWidth:720, marginTop:8
        }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => onPick(s.prompt)}
              className="focus-ring"
              style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'14px 16px', borderRadius:14,
                background: t.theme==='dark' ? 'rgba(255,255,255,0.04)' : '#fff',
                border:'1px solid var(--line-strong)',
                color:'var(--ink-900)', fontSize:14, fontWeight:600,
                cursor:'pointer', textAlign:'left',
                boxShadow: t.theme==='dark' ? 'none' : '0 1px 0 rgba(91,30,130,.04)',
                transition:'transform .15s, box-shadow .15s, border-color .15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.borderColor = accent.solid;
                e.currentTarget.style.boxShadow = `0 6px 18px -8px ${accent.solid}55`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform='';
                e.currentTarget.style.borderColor='var(--line-strong)';
                e.currentTarget.style.boxShadow = t.theme==='dark' ? 'none' : '0 1px 0 rgba(91,30,130,.04)';
              }}>
              <span style={{
                width:30, height:30, borderRadius:9, flexShrink:0,
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                background: accent.soft, color: accent.deep,
                fontWeight:700, fontSize:14
              }}>{s.icon}</span>
              <span style={{ lineHeight:1.3 }}>{s.label}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{
        display:'flex', gap:18, marginTop:8, color:'var(--ink-500)',
        fontSize:12, alignItems:'center', flexWrap:'wrap', justifyContent:'center'
      }}>
        <KPI label="Costo total" value="< $5 USD" />
        <Sep />
        <KPI label="Tiempo de respuesta" value="~2s" />
        <Sep />
        <KPI label="Branding" value="100% BIA+" />
      </div>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <span style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', gap:2 }}>
      <b style={{ fontSize:13, color:'var(--ink-900)', fontWeight:700 }}>{value}</b>
      <span style={{ fontSize:11, color:'var(--ink-500)' }}>{label}</span>
    </span>
  );
}
function Sep() { return <span style={{ width:1, height:18, background:'var(--line-strong)' }} /> }

// ── Chat view ─────────────────────────────────────────────────────────────
function ChatView({ messages, busy, scrollerRef, accent, density }) {
  return (
    <div ref={scrollerRef} className="scroll" style={{
      flex:1, overflowY:'auto', padding:'28px 4px 16px',
      display:'flex', flexDirection:'column', gap: density==='compact'?12:18
    }}>
      {messages.map(m => (
        <Bubble key={m.id} msg={m} accent={accent} />
      ))}
      {busy && (
        <div className="msg-in" style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
          <Avatar accent={accent} />
          <div style={{
            padding:'14px 18px', borderRadius:'18px 18px 18px 4px',
            background:'var(--paper-2)', border:'1px solid var(--line)',
            color:'var(--ink-700)', fontSize:14
          }}>
            <span className="dot"></span><span className="dot"></span><span className="dot"></span>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ accent, size=32 }) {
  return (
    <span style={{
      width:size, height:size, borderRadius:'50%',
      background:`conic-gradient(from 210deg, ${accent.solid}, var(--blue-500), var(--blue-300), ${accent.solid})`,
      flexShrink:0,
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      padding:2
    }}>
      <span style={{
        width:'100%', height:'100%', borderRadius:'50%',
        background:'var(--paper)', display:'inline-flex',
        alignItems:'center', justifyContent:'center',
        fontWeight:800, fontSize:size*0.4, color:'var(--ink-900)',
        letterSpacing:'-0.04em'
      }}>
        Evy
      </span>
    </span>
  );
}

function Bubble({ msg, accent }) {
  const isUser = msg.role === 'user';
  return (
    <div className="msg-in" style={{
      display:'flex', gap:12, alignItems:'flex-end',
      flexDirection: isUser ? 'row-reverse' : 'row'
    }}>
      {!isUser && <Avatar accent={accent} />}
      <div style={{
        maxWidth:'72%', padding:'12px 16px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser
          ? `linear-gradient(135deg, ${accent.solid} 0%, var(--blue-500) 110%)`
          : 'var(--paper-2)',
        border: isUser ? 'none' : '1px solid var(--line)',
        color: isUser ? '#fff' : 'var(--ink-900)',
        fontSize:14.5, lineHeight:1.55,
        boxShadow: isUser
          ? `0 8px 22px -10px ${accent.solid}66`
          : 'none',
        whiteSpace:'pre-wrap', textWrap:'pretty'
      }}>
        {msg.error
          ? <span style={{ color:'#C42A86', display:'inline-flex', gap:6, alignItems:'center' }}>
              <span>⚠</span>{msg.content}
            </span>
          : (isUser ? msg.content : <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>)}
        <div style={{
          marginTop:6, fontSize:10.5, opacity:.55, fontWeight:500,
          letterSpacing:'.02em', color: isUser ? 'rgba(255,255,255,.85)' : 'var(--ink-500)'
        }}>
          {relTime(msg.ts)}
        </div>
      </div>
    </div>
  );
}

// ── Composer ──────────────────────────────────────────────────────────────
function Composer({ input, setInput, onSend, busy, accent, started, inputRef }) {
  const [popping, setPopping] = useState(false);
  function trigger() {
    if (!input.trim() || busy) return;
    setPopping(true); setTimeout(() => setPopping(false), 220);
    onSend();
  }
  return (
    <div style={{
      position:'sticky', bottom:0, zIndex:4,
      padding:'14px 24px 22px',
      background: `linear-gradient(to top, var(--paper) 60%, transparent)`,
    }}>
      <div style={{ maxWidth: 820, margin:'0 auto' }}>
        <div style={{
          display:'flex', alignItems:'flex-end', gap:10,
          padding:'10px 10px 10px 18px', borderRadius:18,
          background: 'var(--paper-2)',
          border:'1px solid var(--line-strong)',
          boxShadow: `0 18px 40px -28px ${accent.solid}55`
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); trigger(); }
            }}
            rows={1}
            placeholder={started ? "Pregúntame algo más…" : "Escribe tu pregunta sobre BIA+…"}
            style={{
              flex:1, resize:'none', border:'none', outline:'none',
              background:'transparent', color:'var(--ink-900)',
              fontFamily:'inherit', fontSize:15, lineHeight:1.5,
              maxHeight:120, minHeight:24, padding:'8px 4px'
            }}
          />
          <button onClick={trigger}
            disabled={!input.trim() || busy}
            className={popping ? 'pop focus-ring' : 'focus-ring'}
            style={{
              width:42, height:42, borderRadius:13, border:'none',
              cursor: input.trim() && !busy ? 'pointer' : 'default',
              background: input.trim() && !busy
                ? `linear-gradient(135deg, ${accent.solid} 0%, var(--blue-500) 110%)`
                : 'var(--line-strong)',
              color:'#fff', display:'inline-flex', alignItems:'center',
              justifyContent:'center', flexShrink:0,
              transition:'transform .15s, box-shadow .15s',
              boxShadow: input.trim() && !busy
                ? `0 10px 22px -10px ${accent.solid}aa`
                : 'none'
            }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                 stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12 L19 12 M13 6 L19 12 L13 18" />
            </svg>
          </button>
        </div>
        <div style={{
          textAlign:'center', marginTop:8, fontSize:11,
          color:'var(--ink-500)', display:'flex', justifyContent:'center', gap:14
        }}>
          <span>↵ enviar</span>
          <span>⇧↵ nueva línea</span>
          <span>Respuestas generadas por IA — verifica datos críticos.</span>
        </div>
      </div>
    </div>
  );
}

// ── Tweaks panel ──────────────────────────────────────────────────────────
function Tweaks({ t, setTweak }) {
  return (
    <TweaksPanel>
      <TweakSection label="Apariencia" />
      <TweakRadio label="Tema" value={t.theme}
                  options={['light','dark']}
                  onChange={(v) => setTweak('theme', v)} />
      <TweakRadio label="Densidad" value={t.density}
                  options={['compact','comfy']}
                  onChange={(v) => setTweak('density', v)} />
      <TweakRadio label="Encabezado" value={t.headerStyle}
                  options={['minimal','full']}
                  onChange={(v) => setTweak('headerStyle', v)} />

      <TweakSection label="Color de acento" />
      <TweakColor label="Acento" value={ACCENTS[t.accent].solid}
                  options={[ACCENTS.blue.solid, ACCENTS.magenta.solid, ACCENTS.purple.solid, ACCENTS.yellow.solid]}
                  onChange={(v) => {
                    const key = Object.entries(ACCENTS).find(([,a]) => a.solid === v)?.[0] || 'blue';
                    setTweak('accent', key);
                  }} />

      <TweakSection label="Comportamiento" />
      <TweakToggle label="Mostrar sugerencias" value={t.showSuggestions}
                   onChange={(v) => setTweak('showSuggestions', v)} />
      <TweakToggle label="Logo animado" value={t.rotateLogo}
                   onChange={(v) => setTweak('rotateLogo', v)} />
    </TweaksPanel>
  );
}
