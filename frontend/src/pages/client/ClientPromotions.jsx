import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import api from '../../lib/api.js';

const ICONS = {
  Ofertas: '🏷️', Combos: '📦', Puntos: '⭐',
  Limpieza: '🧹', Bebidas: '🥤', Alimentos: '🥫',
  General: '📢', default: '📢',
};

const CATEGORY_COLORS = {
  Ofertas:   { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: '#fde68a' },
  Combos:    { bg: 'rgba(92,181,22,0.12)',  border: 'rgba(92,181,22,0.25)',  text: '#9de360' },
  Puntos:    { bg: 'rgba(92,181,22,0.15)',  border: 'rgba(92,181,22,0.30)',  text: '#7bd132' },
  Limpieza:  { bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.25)', text: '#7dd3fc' },
  Bebidas:   { bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.25)', text: '#d8b4fe' },
  Alimentos: { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  text: '#fca5a5' },
  default:   { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', text: '#f0f4ec' },
};

const getCatStyle = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS.default;

function PromoCard({ promo, onClick }) {
  const catStyle = getCatStyle(promo.category);
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="card overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
    >
      {promo.image && !imgError && (
        <div className="relative">
          <img
            src={promo.image}
            alt={promo.title}
            className="w-full h-44 object-cover"
            onError={() => setImgError(true)}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(8,13,5,0.85) 0%, transparent 60%)' }}
          />
          <div className="absolute bottom-3 left-3">
            <span
              className="badge text-xs font-semibold"
              style={{ background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}` }}
            >
              {ICONS[promo.category] || ICONS.default} {promo.category}
            </span>
          </div>
        </div>
      )}

      <div className="p-4">
        {(!promo.image || imgError) && (
          <span
            className="badge text-xs font-semibold mb-2"
            style={{ background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}` }}
          >
            {ICONS[promo.category] || ICONS.default} {promo.category}
          </span>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white">{promo.title}</h3>
            <div className="text-sm mt-1 line-clamp-2" style={{ color: 'rgba(240,244,236,0.60)' }}>
              <ReactMarkdown
                components={{
                  strong: ({ children }) => (
                    <strong style={{ color: '#9de360', fontWeight: 700 }}>{children}</strong>
                  ),
                  em: ({ children }) => <em style={{ color: '#fde68a' }}>{children}</em>,
                  p: ({ children }) => <span>{children}</span>,
                }}
              >
                {promo.description}
              </ReactMarkdown>
            </div>
          </div>
          <span style={{ color: 'rgba(240,244,236,0.25)', fontSize: '1.2rem', flexShrink: 0 }}>›</span>
        </div>

        {promo.validTo && (
          <p className="text-xs mt-2" style={{ color: 'rgba(240,244,236,0.35)' }}>
            Válido hasta{' '}
            {new Date(promo.validTo).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function PromoModal({ promo, onClose }) {
  const catStyle = getCatStyle(promo.category);
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl"
        style={{ background: '#111d0d', border: '1px solid rgba(92,181,22,0.20)' }}
        onClick={e => e.stopPropagation()}
      >
        {promo.image && !imgError ? (
          <div className="relative">
            <img
              src={promo.image}
              alt={promo.title}
              className="w-full h-56 object-cover rounded-t-2xl"
              onError={() => setImgError(true)}
            />
            <div
              className="absolute inset-0 rounded-t-2xl"
              style={{ background: 'linear-gradient(to top, #111d0d 0%, transparent 55%)' }}
            />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.50)', color: 'rgba(255,255,255,0.70)' }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex justify-end p-4">
            <button onClick={onClose} className="text-white/40 hover:text-white text-xl p-2">✕</button>
          </div>
        )}

        <div className="p-6">
          <div className="mb-4">
            <span
              className="badge text-xs font-semibold mb-2"
              style={{ background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}` }}
            >
              {ICONS[promo.category] || ICONS.default} {promo.category}
            </span>
            <h2 className="font-display font-bold text-2xl text-white mt-2">{promo.title}</h2>
          </div>

          <div className="leading-relaxed" style={{ color: 'rgba(240,244,236,0.72)' }}>
            <ReactMarkdown
              components={{
                strong: ({ children }) => (
                  <strong style={{ color: '#9de360', fontWeight: 700 }}>{children}</strong>
                ),
                em: ({ children }) => <em style={{ color: '#fde68a' }}>{children}</em>,
                p: ({ children }) => (
                  <p style={{ marginBottom: '0.75rem', color: 'rgba(240,244,236,0.72)' }}>{children}</p>
                ),
                li: ({ children }) => (
                  <li style={{ color: 'rgba(240,244,236,0.65)', marginBottom: '0.25rem' }}>{children}</li>
                ),
                ul: ({ children }) => (
                  <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem' }}>{children}</ul>
                ),
              }}
            >
              {promo.description}
            </ReactMarkdown>
          </div>

          {(promo.validFrom || promo.validTo) && (
            <div
              className="mt-4 pt-4 flex gap-4 text-xs"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(240,244,236,0.38)' }}
            >
              {promo.validFrom && (
                <span>Desde: {new Date(promo.validFrom).toLocaleDateString('es-AR')}</span>
              )}
              {promo.validTo && (
                <span>Hasta: {new Date(promo.validTo).toLocaleDateString('es-AR')}</span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ClientPromotions() {
  const [cat, setCat] = useState('Todas');
  const [selected, setSelected] = useState(null);

  const { data: promoData, isLoading } = useQuery({
    queryKey: ['promotions-client'],
    queryFn: () => api.get('/api/promotions').then(r => r.data),
  });

  const promotions = promoData?.promotions || [];

  // Categorías dinámicas — sacadas de las promociones que existen
  const categories = ['Todas', ...new Set(promotions.map(p => p.category))];
  const filtered = cat === 'Todas' ? promotions : promotions.filter(p => p.category === cat);

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="font-display font-bold text-2xl text-white">Promociones</h2>
        <p className="text-sm mt-1" style={{ color: 'rgba(240,244,236,0.50)' }}>
          Ofertas y descuentos especiales para vos
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={cat === c ? {
              background: 'rgba(92,181,22,0.25)',
              color: '#9de360',
              border: '1px solid rgba(92,181,22,0.40)',
            } : {
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(240,244,236,0.50)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {ICONS[c] || ''} {c}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card h-40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center" style={{ color: 'rgba(240,244,236,0.30)' }}>
          <div className="text-4xl mb-2">🏷️</div>
          <p>No hay promociones en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(promo => (
            <PromoCard key={promo.id} promo={promo} onClick={() => setSelected(promo)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <PromoModal promo={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}