import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';

// Hook para categorías dinámicas
function usePromotionCategories() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['promotion-categories'],
    queryFn: () => api.get('/api/admin/promotion-categories').then(r => r.data.categories),
    initialData: ['Ofertas', 'Combos', 'Puntos', 'Limpieza', 'Bebidas', 'Alimentos', 'General'],
  });

  const saveMutation = useMutation({
    mutationFn: (categories) => api.put('/api/admin/promotion-categories', { categories }),
    onSuccess: () => {
      toast.success('Categorías guardadas');
      queryClient.invalidateQueries({ queryKey: ['promotion-categories'] });
    },
    onError: () => toast.error('Error al guardar categorías'),
  });

  return { categories: data || [], saveCategories: saveMutation.mutate, isSaving: saveMutation.isPending };
}

// Modal para gestionar categorías
function CategoriesModal({ categories, onClose, onSave, isSaving }) {
  const [list, setList] = useState([...categories]);
  const [newCat, setNewCat] = useState('');

  const add = () => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (list.includes(trimmed)) { toast.error('Ya existe esa categoría'); return; }
    setList(prev => [...prev, trimmed]);
    setNewCat('');
  };

  const remove = (cat) => {
    if (list.length <= 1) { toast.error('Debe quedar al menos una categoría'); return; }
    setList(prev => prev.filter(c => c !== cat));
  };

  const moveUp = (i) => {
    if (i === 0) return;
    const next = [...list];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setList(next);
  };

  const moveDown = (i) => {
    if (i === list.length - 1) return;
    const next = [...list];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setList(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95 }}
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: '#111d0d', border: '1px solid rgba(92,181,22,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-xl text-white">⚙️ Gestionar categorías</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white p-1">✕</button>
        </div>

        {/* Agregar nueva */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            className="input flex-1"
            placeholder="Nueva categoría..."
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
            maxLength={30}
          />
          <button
            onClick={add}
            disabled={!newCat.trim()}
            className="btn-primary px-4 py-2 text-sm"
          >
            + Agregar
          </button>
        </div>

        {/* Lista de categorías */}
        <div className="space-y-2 mb-5 max-h-64 overflow-y-auto">
          {list.map((cat, i) => (
            <div
              key={cat}
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: 'rgba(92,181,22,0.06)', border: '1px solid rgba(92,181,22,0.12)' }}
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  className="text-xs leading-none transition-colors"
                  style={{ color: i === 0 ? 'rgba(240,244,236,0.15)' : 'rgba(240,244,236,0.45)' }}
                >▲</button>
                <button
                  onClick={() => moveDown(i)}
                  disabled={i === list.length - 1}
                  className="text-xs leading-none transition-colors"
                  style={{ color: i === list.length - 1 ? 'rgba(240,244,236,0.15)' : 'rgba(240,244,236,0.45)' }}
                >▼</button>
              </div>
              <span className="flex-1 text-sm text-white font-medium">{cat}</span>
              <button
                onClick={() => remove(cat)}
                className="text-xs px-2 py-1 rounded-lg transition-colors"
                style={{ background: 'rgba(239,68,68,0.10)', color: '#fca5a5' }}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={() => { onSave(list); onClose(); }}
            disabled={isSaving}
            className="btn-primary flex-1"
          >
            {isSaving ? '⏳...' : '✓ Guardar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PromotionFormModal({ promo, categories, onClose, onSaved }) {
  const isEdit = !!promo;
  const [form, setForm] = useState({
    title:       promo?.title       || '',
    description: promo?.description || '',
    category:    promo?.category    || categories[0] || 'Ofertas',
    image:       promo?.image       || '',
    isVisible:   promo?.isVisible   ?? true,
    validFrom:   promo?.validFrom ? new Date(promo.validFrom).toISOString().split('T')[0] : '',
    validTo:     promo?.validTo   ? new Date(promo.validTo).toISOString().split('T')[0]   : '',
  });
  const [preview, setPreview] = useState(false);
  const [imgError, setImgError] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? api.put(`/api/promotions/${promo.id}`, data)
      : api.post('/api/promotions', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Promoción actualizada' : 'Promoción creada');
      onSaved();
      onClose();
    },
    onError: (err) => {
      const detail = err.response?.data?.details?.[0]?.message;
      toast.error(detail || err.response?.data?.error || 'Error al guardar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/promotions/${promo.id}`),
    onSuccess: () => { toast.success('Eliminada'); onSaved(); onClose(); },
    onError: () => toast.error('Error al eliminar'),
  });

  const set = (f) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [f]: val }));
    if (f === 'image') setImgError(false);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    mutation.mutate({
      ...form,
      image:     form.image.trim() || '',
      validFrom: form.validFrom || null,
      validTo:   form.validTo   || null,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95 }}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: '#111d0d', border: '1px solid rgba(92,181,22,0.20)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-2xl text-white">
            {isEdit ? '✏️ Editar' : '🏷️ Nueva'} Promoción
          </h3>
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className="btn-secondary text-sm py-2 px-3"
          >
            {preview ? '✏️ Editar' : '👁 Preview'}
          </button>
        </div>

        {preview ? (
          <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid rgba(92,181,22,0.15)' }}>
            {form.image && !imgError && (
              <div className="relative">
                <img
                  src={form.image}
                  alt="preview"
                  className="w-full h-44 object-cover"
                  onError={() => setImgError(true)}
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(8,13,5,0.80) 0%, transparent 60%)' }} />
              </div>
            )}
            <div className="p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs mb-1" style={{ color: '#9de360' }}>
                {form.category}
              </p>
              <h4 className="font-semibold text-lg text-white mb-2">{form.title || 'Título'}</h4>
              <div className="text-sm" style={{ color: 'rgba(240,244,236,0.65)' }}>
                <ReactMarkdown
                  components={{
                    strong: ({ children }) => <strong style={{ color: '#9de360' }}>{children}</strong>,
                    p: ({ children }) => <p style={{ marginBottom: '0.5rem' }}>{children}</p>,
                  }}
                >
                  {form.description || '*Descripción con markdown...*'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ) : (
          <form id="promo-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Título *</label>
              <input
                type="text"
                className="input"
                placeholder="2x1 en aceites"
                value={form.title}
                onChange={set('title')}
                required
              />
            </div>

            <div>
              <label className="label">
                Descripción *{' '}
                <span style={{ color: 'rgba(240,244,236,0.35)', fontWeight: 400 }}>
                  — soporta **negrita**, _cursiva_, listas
                </span>
              </label>
              <textarea
                className="input min-h-[100px] resize-y font-mono text-sm"
                placeholder={'**¡Llevá 2 pagá 1!** en todos los aceites.\n- Girasol\n- Oliva'}
                value={form.description}
                onChange={set('description')}
                required
              />
            </div>

            {/* Categoría — select con estilos correctos */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Categoría</label>
                <select
                  className="input"
                  value={form.category}
                  onChange={set('category')}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: '#f0f4ec',
                    // Fix para que las opciones sean visibles en todos los browsers
                    colorScheme: 'dark',
                  }}
                >
                  {categories.map(c => (
                    <option
                      key={c}
                      value={c}
                      style={{ background: '#111d0d', color: '#f0f4ec' }}
                    >
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Visibilidad</label>
                <label
                  className="flex items-center gap-3 h-[46px] px-4 rounded-xl cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <input
                    type="checkbox"
                    checked={form.isVisible}
                    onChange={set('isVisible')}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#5cb516' }}
                  />
                  <span className="text-sm" style={{ color: 'rgba(240,244,236,0.70)' }}>
                    {form.isVisible ? '✅ Visible' : '🙈 Oculta'}
                  </span>
                </label>
              </div>
            </div>

            {/* Imagen */}
            <div>
              <label className="label">Imagen (URL — opcional)</label>
              <input
                type="text"
                className="input"
                placeholder="https://i.imgur.com/ejemplo.jpg"
                value={form.image}
                onChange={set('image')}
              />
              <p className="text-xs mt-1" style={{ color: 'rgba(240,244,236,0.30)' }}>
                Pegá cualquier URL de imagen pública
              </p>
              {form.image && !imgError && (
                <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(92,181,22,0.20)' }}>
                  <img
                    src={form.image}
                    alt="preview"
                    className="w-full h-32 object-cover"
                    onError={() => setImgError(true)}
                    onLoad={() => setImgError(false)}
                  />
                </div>
              )}
              {form.image && imgError && (
                <div
                  className="mt-2 rounded-xl p-3 text-xs text-center"
                  style={{ background: 'rgba(239,68,68,0.10)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.20)' }}
                >
                  ⚠️ No se pudo cargar la imagen. Verificá la URL.
                </div>
              )}
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Válida desde</label>
                <input type="date" className="input" value={form.validFrom} onChange={set('validFrom')}
                  style={{ colorScheme: 'dark' }} />
              </div>
              <div>
                <label className="label">Válida hasta</label>
                <input type="date" className="input" value={form.validTo} onChange={set('validTo')}
                  style={{ colorScheme: 'dark' }} />
              </div>
            </div>
          </form>
        )}

        {/* Botones */}
        <div
          className="flex gap-3 pt-4 mt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {isEdit && (
            <button
              type="button"
              onClick={() => { if (confirm('¿Eliminar esta promoción?')) deleteMutation.mutate(); }}
              className="btn-danger text-sm py-2.5 px-4"
              disabled={deleteMutation.isPending}
            >
              🗑
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="submit"
            form="promo-form"
            className="btn-primary flex-1"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? '⏳...' : `✓ ${isEdit ? 'Guardar' : 'Crear'}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AdminPromotions() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const { categories, saveCategories, isSaving } = usePromotionCategories();

  const { data } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: () => api.get('/api/promotions').then(r => r.data),
  });

  const promotions = data?.promotions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-3xl text-white">Promociones</h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(240,244,236,0.45)' }}>
            {promotions.length} promociones · {promotions.filter(p => p.isVisible).length} visibles
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCatModal(true)}
            className="btn-secondary text-sm py-2.5 px-4"
          >
            ⚙️ Categorías
          </button>
          <button onClick={() => setModal('create')} className="btn-primary">
            + Nueva promoción
          </button>
        </div>
      </div>

      {/* Lista */}
      {promotions.length === 0 ? (
        <div className="card p-12 text-center" style={{ color: 'rgba(240,244,236,0.30)' }}>
          <div className="text-5xl mb-3">🏷️</div>
          <p>No hay promociones. ¡Creá la primera!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((promo, i) => (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`card overflow-hidden cursor-pointer transition-all ${!promo.isVisible ? 'opacity-55' : ''}`}
              style={{ borderColor: 'rgba(92,181,22,0.10)' }}
              onClick={() => setModal(promo)}
            >
              <div className="flex">
                {/* Thumbnail */}
                {promo.image && (
                  <img
                    src={promo.image}
                    alt={promo.title}
                    className="w-20 h-20 object-cover flex-shrink-0"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                )}
                {!promo.image && (
                  <div
                    className="w-16 flex-shrink-0 flex items-center justify-center text-2xl"
                    style={{ background: 'rgba(92,181,22,0.06)' }}
                  >
                    🏷️
                  </div>
                )}

                <div className="flex-1 min-w-0 p-4">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-white text-sm">{promo.title}</h3>
                    <span
                      className="badge text-xs"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,244,236,0.55)' }}
                    >
                      {promo.category}
                    </span>
                    <span
                      className="badge text-xs"
                      style={promo.isVisible
                        ? { background: 'rgba(92,181,22,0.12)', color: '#9de360', border: '1px solid rgba(92,181,22,0.25)' }
                        : { background: 'rgba(255,255,255,0.05)', color: 'rgba(240,244,236,0.30)', border: '1px solid rgba(255,255,255,0.08)' }
                      }
                    >
                      {promo.isVisible ? '👁 Visible' : '🙈 Oculta'}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: 'rgba(240,244,236,0.45)' }}>
                    {promo.description.replace(/\*\*/g, '').replace(/_/g, '').replace(/\n/g, ' ')}
                  </p>
                </div>

                <div className="flex items-center pr-4">
                  <span style={{ color: 'rgba(240,244,236,0.25)', fontSize: '1.2rem' }}>›</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <PromotionFormModal
            promo={modal === 'create' ? null : modal}
            categories={categories}
            onClose={() => setModal(null)}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-promotions'] })}
          />
        )}
        {showCatModal && (
          <CategoriesModal
            categories={categories}
            onClose={() => setShowCatModal(false)}
            onSave={saveCategories}
            isSaving={isSaving}
          />
        )}
      </AnimatePresence>
    </div>
  );
}