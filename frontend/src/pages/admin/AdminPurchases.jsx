import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';
import QRScanner from '../../components/QRScanner.jsx';

const PAYMENT_METHODS = [
  {
    key: 'TRANSFER',
    label: 'Transferencia / QR',
    icon: '📲',
    activeBg: 'rgba(245,158,11,0.15)',
    activeBorder: 'rgba(245,158,11,0.40)',
    activeText: '#fde68a',
  },
  {
    key: 'CASH',
    label: 'Efectivo',
    icon: '💵',
    activeBg: 'rgba(92,181,22,0.15)',
    activeBorder: 'rgba(92,181,22,0.40)',
    activeText: '#9de360',
  },
];

const MULTIPLIERS = [
  { value: 1,   label: 'x1',   sublabel: 'Normal',       color: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.10)', text: 'rgba(240,244,236,0.55)' },
  { value: 1.5, label: 'x1.5', sublabel: '+50%',         color: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.28)', text: '#fde68a' },
  { value: 2,   label: 'x2',   sublabel: 'Doble 🔥',     color: 'rgba(92,181,22,0.12)',   border: 'rgba(92,181,22,0.28)',  text: '#9de360' },
  { value: 3,   label: 'x3',   sublabel: 'Triple ⭐',    color: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.28)', text: '#c4b5fd' },
];

function UserCard({ user, onClear }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: 'rgba(92,181,22,0.10)', border: '1px solid rgba(92,181,22,0.25)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0"
          style={{ background: 'rgba(92,181,22,0.20)', color: '#9de360' }}
        >
          {user.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{user.name}</p>
          <p className="text-xs truncate" style={{ color: 'rgba(240,244,236,0.50)' }}>
            DNI: {user.dni} · {user.phone}
          </p>
        </div>
        <div className="text-right flex-shrink-0 mr-1">
          <p className="font-mono font-bold" style={{ color: '#9de360' }}>
            {user.points.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: 'rgba(240,244,236,0.40)' }}>pts</p>
        </div>
        <button
          onClick={onClear}
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}
        >
          ✕
        </button>
      </div>
      <div
        className="mt-3 pt-3 flex justify-between text-xs"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(240,244,236,0.45)' }}
      >
        <span>Gastado: <span style={{ color: '#9de360' }}>${user.totalSpent.toLocaleString()}</span></span>
        <span>{user._count?.purchases || 0} compras</span>
      </div>
    </motion.div>
  );
}

function PreviewBox({ amount, paymentMethod, multiplier, config }) {
  if (!amount || !config || parseFloat(amount) <= 0) return null;

  const isCash = paymentMethod === 'CASH';
  const amt = parseFloat(amount);
  const pointsBase = isCash ? config.pointsCashAmount : config.pointsTransferAmount;
  const pointsPer  = isCash ? config.pointsCashPer    : config.pointsTransferPer;
  const basePoints  = Math.floor(amt / pointsBase) * pointsPer;
  const finalPoints = Math.floor(basePoints * multiplier);
  const baseNumbers  = Math.floor(amt / config.raffleAmountPerNumber);
  const bonusNumbers = isCash && baseNumbers > 0 ? config.raffleCashBonus : 0;
  const totalNumbers = baseNumbers + bonusNumbers;
  const hasMultiplier = multiplier > 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-xs uppercase tracking-wider font-medium mb-3"
        style={{ color: 'rgba(240,244,236,0.40)' }}>
        Vista previa
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3 text-center"
          style={{ background: hasMultiplier ? 'rgba(139,92,246,0.10)' : isCash ? 'rgba(92,181,22,0.10)' : 'rgba(245,158,11,0.10)' }}>
          <p className="text-xl mb-1">⭐</p>
          {hasMultiplier && (
            <p className="text-xs line-through mb-0.5" style={{ color: 'rgba(240,244,236,0.35)' }}>
              {basePoints} pts
            </p>
          )}
          <p className="font-mono font-black text-xl"
            style={{ color: hasMultiplier ? '#c4b5fd' : isCash ? '#9de360' : '#fde68a' }}>
            +{finalPoints}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.40)' }}>puntos</p>
        </div>
        <div className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(92,181,22,0.08)' }}>
          <p className="text-xl mb-1">🎰</p>
          <p className="font-mono font-black text-xl" style={{ color: '#9de360' }}>
            +{totalNumbers}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.40)' }}>números</p>
          {isCash && bonusNumbers > 0 && (
            <p className="text-xs mt-0.5 font-medium" style={{ color: '#9de360' }}>
              +{bonusNumbers} bonus
            </p>
          )}
        </div>
      </div>
      {hasMultiplier && (
        <div className="mt-3 px-3 py-2 rounded-lg flex items-center gap-2"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)' }}>
          <span className="text-sm">🔥</span>
          <p className="text-xs font-medium" style={{ color: '#c4b5fd' }}>
            Multiplicador x{multiplier} activo
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default function AdminPurchases() {
  const queryClient = useQueryClient();
  const [showScanner, setShowScanner] = useState(false);
  const [dniSearch, setDniSearch] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('TRANSFER');
  const [multiplier, setMultiplier] = useState(1);
  const [notes, setNotes] = useState('');
  const amountRef = useRef();

  const { data: configData } = useQuery({
    queryKey: ['store-config'],
    queryFn: () => api.get('/api/admin/config').then(r => r.data.config),
  });

  const { data: purchasesData, refetch } = useQuery({
    queryKey: ['admin-purchases'],
    queryFn: () => api.get('/api/purchases?limit=20').then(r => r.data),
  });

  const findByQR = useMutation({
    mutationFn: (qrCode) => api.get(`/api/purchases/scan/${qrCode.trim()}`).then(r => r.data.user),
    onSuccess: (user) => {
      setFoundUser(user);
      setShowScanner(false);
      toast.success(`✅ ${user.name}`);
      setTimeout(() => amountRef.current?.focus(), 200);
    },
    onError: () => {
      toast.error('QR no válido');
      setShowScanner(false);
    },
  });

  const findByDNI = useMutation({
    mutationFn: (dni) =>
      api.get(`/api/admin/clients?search=${dni.trim()}&limit=1`).then(r => r.data.users[0]),
    onSuccess: (user) => {
      if (!user) return toast.error('Cliente no encontrado');
      setFoundUser(user);
      setDniSearch('');
      toast.success(`✅ ${user.name}`);
      setTimeout(() => amountRef.current?.focus(), 200);
    },
    onError: () => toast.error('Error al buscar'),
  });

  const registerPurchase = useMutation({
    mutationFn: (data) => api.post('/api/purchases', data),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setFoundUser(null);
      setAmount('');
      setNotes('');
      setPaymentMethod('TRANSFER');
      setMultiplier(1);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error'),
  });

  const purchases = purchasesData?.purchases || [];

  return (
    <>
      <AnimatePresence>
        {showScanner && (
          <QRScanner
            onScan={(code) => findByQR.mutate(code)}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Cargar Compra</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(240,244,236,0.45)' }}>
            Registrá la compra de un cliente
          </p>
        </div>

        {/* ===== PASO 1: CLIENTE ===== */}
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-white text-sm uppercase tracking-wider"
            style={{ color: 'rgba(240,244,236,0.60)' }}>
            1. Identificar cliente
          </h3>

          {!foundUser ? (
            <>
              <button
                onClick={() => setShowScanner(true)}
                className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, rgba(92,181,22,0.18), rgba(92,181,22,0.08))',
                  border: '2px solid rgba(92,181,22,0.30)',
                  color: '#9de360',
                  fontSize: '16px',
                }}
              >
                <span className="text-2xl">📷</span>
                Escanear QR del cliente
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <span className="text-xs" style={{ color: 'rgba(240,244,236,0.30)' }}>o DNI</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); if (dniSearch.trim()) findByDNI.mutate(dniSearch); }}
                className="flex gap-2"
              >
                <input
                  type="number"
                  className="input flex-1"
                  placeholder="Ingresá el DNI..."
                  value={dniSearch}
                  onChange={e => setDniSearch(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn-primary px-4 flex-shrink-0"
                  disabled={findByDNI.isPending || !dniSearch.trim()}
                  style={{ minWidth: '48px' }}
                >
                  {findByDNI.isPending ? '⏳' : '🔍'}
                </button>
              </form>
            </>
          ) : (
            <UserCard user={foundUser} onClear={() => setFoundUser(null)} />
          )}
        </div>

        {/* ===== PASO 2: DETALLE ===== */}
        <div className={`card p-4 space-y-5 ${!foundUser ? 'opacity-40 pointer-events-none' : ''}`}>
          <h3 className="font-semibold text-sm uppercase tracking-wider"
            style={{ color: 'rgba(240,244,236,0.60)' }}>
            2. Detalle de la compra
          </h3>

          {/* Medio de pago */}
          <div>
            <label className="label">Medio de pago</label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map(pm => {
                const isActive = paymentMethod === pm.key;
                return (
                  <button
                    key={pm.key}
                    type="button"
                    onClick={() => setPaymentMethod(pm.key)}
                    className="p-3 rounded-xl text-left transition-all active:scale-95"
                    style={{
                      background: isActive ? pm.activeBg : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${isActive ? pm.activeBorder : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <span className="text-xl block mb-1">{pm.icon}</span>
                    <p className="text-sm font-semibold leading-tight"
                      style={{ color: isActive ? pm.activeText : 'rgba(240,244,236,0.50)' }}>
                      {pm.label}
                    </p>
                    {pm.key === 'CASH' && (
                      <p className="text-xs mt-1 font-medium" style={{ color: '#9de360' }}>
                        ✨ Pts dobles
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="label">Monto total ($)</label>
            <input
              ref={amountRef}
              type="number"
              step="1"
              min="1"
              className="input font-mono text-2xl"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          {/* Multiplicador */}
          <div>
            <label className="label">Multiplicador de puntos</label>
            <div className="grid grid-cols-4 gap-2">
              {MULTIPLIERS.map(m => {
                const isActive = multiplier === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMultiplier(m.value)}
                    className="py-3 rounded-xl text-center transition-all active:scale-95"
                    style={{
                      background: isActive ? m.color : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${isActive ? m.border : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <p className="font-mono font-black text-base"
                      style={{ color: isActive ? m.text : 'rgba(240,244,236,0.40)' }}>
                      {m.label}
                    </p>
                    <p className="text-xs mt-0.5 leading-tight"
                      style={{ color: isActive ? m.text : 'rgba(240,244,236,0.28)' }}>
                      {m.sublabel}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <PreviewBox
            amount={amount}
            paymentMethod={paymentMethod}
            multiplier={multiplier}
            config={configData}
          />

          {/* Notas */}
          <div>
            <label className="label">Notas (opcional)</label>
            <input
              type="text"
              className="input"
              placeholder="Observaciones..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Botón */}
          <button
            onClick={() => registerPurchase.mutate({
              userId: foundUser?.id,
              amount: parseFloat(amount),
              paymentMethod,
              multiplier,
              notes: notes || undefined,
            })}
            disabled={!foundUser || !amount || parseFloat(amount) <= 0 || registerPurchase.isPending}
            className="btn-primary w-full py-4 text-base"
          >
            {registerPurchase.isPending
              ? '⏳ Registrando...'
              : `✓ Registrar ${multiplier > 1 ? `(x${multiplier}pts)` : ''} ${paymentMethod === 'CASH' ? '💵' : '📲'}`
            }
          </button>
        </div>

        {/* ===== COMPRAS RECIENTES ===== */}
        {purchases.length > 0 && (
          <div>
            <h3 className="font-semibold text-white mb-3">Compras recientes</h3>
            <div className="card divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {purchases.map(p => (
                <div key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white text-sm truncate">{p.user?.name}</p>
                      <p className="text-xs" style={{ color: 'rgba(240,244,236,0.40)' }}>
                        {new Date(p.createdAt).toLocaleString('es-AR', {
                          day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span
                      className="badge text-xs flex-shrink-0"
                      style={p.paymentMethod === 'CASH'
                        ? { background: 'rgba(92,181,22,0.12)', color: '#9de360', border: '1px solid rgba(92,181,22,0.25)' }
                        : { background: 'rgba(245,158,11,0.12)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.25)' }
                      }
                    >
                      {p.paymentMethod === 'CASH' ? '💵' : '📲'}{' '}
                      {p.paymentMethod === 'CASH' ? 'Efectivo' : 'Transfer'}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="font-mono font-bold" style={{ color: '#6ee7b7' }}>
                      ${p.amount.toLocaleString()}
                    </span>
                    <span className="font-mono" style={{ color: '#fde68a' }}>
                      +{p.points} pts
                    </span>
                    {p.numbers?.length > 0 && (
                      <span style={{ color: '#9de360' }}>
                        +{p.numbers.length} núm.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
