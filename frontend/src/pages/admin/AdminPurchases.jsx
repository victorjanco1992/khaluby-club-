import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';
import QRScanner from '../../components/QRScanner.jsx';

const PAYMENT_METHODS = [
  {
    key: 'TRANSFER',
    label: 'Transferencia / QR / Débito',
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

// Multiplicadores disponibles
const MULTIPLIERS = [
  { value: 1,   label: 'x1',  sublabel: 'Normal',         color: 'rgba(255,255,255,0.08)',  border: 'rgba(255,255,255,0.12)', text: 'rgba(240,244,236,0.60)' },
  { value: 1.5, label: 'x1.5', sublabel: '+50% pts',      color: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.30)', text: '#fde68a' },
  { value: 2,   label: 'x2',  sublabel: 'Doble pts 🔥',   color: 'rgba(92,181,22,0.12)',    border: 'rgba(92,181,22,0.30)',  text: '#9de360' },
  { value: 3,   label: 'x3',  sublabel: 'Triple pts ⭐',  color: 'rgba(139,92,246,0.12)',   border: 'rgba(139,92,246,0.30)', text: '#c4b5fd' },
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
          className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xl flex-shrink-0"
          style={{ background: 'rgba(92,181,22,0.20)', color: '#9de360' }}
        >
          {user.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white">{user.name}</p>
          <p className="text-xs" style={{ color: 'rgba(240,244,236,0.50)' }}>
            DNI: {user.dni} · {user.phone}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-mono font-bold text-lg" style={{ color: '#9de360' }}>
            {user.points.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: 'rgba(240,244,236,0.40)' }}>puntos</p>
        </div>
        <button
          onClick={onClear}
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}
          title="Cambiar cliente"
        >
          ✕
        </button>
      </div>
      <div
        className="mt-3 pt-3 flex justify-between text-xs"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(240,244,236,0.45)' }}
      >
        <span>
          Total gastado:{' '}
          <span style={{ color: '#9de360' }}>${user.totalSpent.toLocaleString()}</span>
        </span>
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
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'rgba(240,244,236,0.40)' }}>
        Vista previa
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Puntos */}
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: hasMultiplier ? 'rgba(139,92,246,0.12)' : isCash ? 'rgba(92,181,22,0.10)' : 'rgba(245,158,11,0.10)' }}
        >
          <p className="text-2xl mb-1">⭐</p>

          {/* Si hay multiplicador, mostrar base tachada y final */}
          {hasMultiplier ? (
            <div>
              <p className="text-sm line-through" style={{ color: 'rgba(240,244,236,0.35)' }}>
                {basePoints} pts
              </p>
              <p className="font-mono font-black text-2xl" style={{ color: '#c4b5fd' }}>
                +{finalPoints}
              </p>
            </div>
          ) : (
            <p className="font-mono font-black text-2xl" style={{ color: isCash ? '#9de360' : '#fde68a' }}>
              +{finalPoints}
            </p>
          )}

          <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.40)' }}>puntos</p>

          {hasMultiplier && (
            <p className="text-xs mt-1 font-bold" style={{ color: '#c4b5fd' }}>
              multiplicador x{multiplier} activo
            </p>
          )}
        </div>

        {/* Números sorteo */}
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(92,181,22,0.08)' }}
        >
          <p className="text-2xl mb-1">🎰</p>
          <p className="font-mono font-black text-2xl" style={{ color: '#9de360' }}>
            +{totalNumbers}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.40)' }}>números</p>
          {isCash && bonusNumbers > 0 && (
            <p className="text-xs mt-1 font-medium" style={{ color: '#9de360' }}>
              {baseNumbers} +{bonusNumbers} bonus
            </p>
          )}
        </div>
      </div>

      {/* Badges de condiciones activas */}
      <div className="flex flex-wrap gap-2">
        {isCash && (
          <span
            className="badge text-xs"
            style={{ background: 'rgba(92,181,22,0.10)', color: '#9de360', border: '1px solid rgba(92,181,22,0.20)' }}
          >
            💵 Efectivo — puntos base dobles
          </span>
        )}
        {hasMultiplier && (
          <span
            className="badge text-xs"
            style={{ background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' }}
          >
            🔥 Multiplicador x{multiplier} aplicado
          </span>
        )}
      </div>
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
      toast.error('QR no válido o cliente no encontrado');
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

      <div className="space-y-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-white">Cargar Compra</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(240,244,236,0.45)' }}>
            Registrá la compra de un cliente
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ===== BUSCAR CLIENTE ===== */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white">1. Identificar cliente</h3>

            {!foundUser ? (
              <div className="space-y-3">
                {/* Botón escáner */}
                <button
                  onClick={() => setShowScanner(true)}
                  className="w-full py-5 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, rgba(92,181,22,0.18), rgba(92,181,22,0.08))',
                    border: '2px solid rgba(92,181,22,0.30)',
                    color: '#9de360',
                  }}
                >
                  <span className="text-3xl">📷</span>
                  Escanear QR del cliente
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  <span className="text-xs px-2" style={{ color: 'rgba(240,244,236,0.30)' }}>
                    o buscá por DNI
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                </div>

                <form
                  onSubmit={(e) => { e.preventDefault(); if (dniSearch.trim()) findByDNI.mutate(dniSearch); }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder="Ingresá el DNI..."
                    value={dniSearch}
                    onChange={e => setDniSearch(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn-primary px-4 py-3 flex-shrink-0"
                    disabled={findByDNI.isPending || !dniSearch.trim()}
                  >
                    {findByDNI.isPending ? '⏳' : '🔍'}
                  </button>
                </form>
              </div>
            ) : (
              <UserCard user={foundUser} onClear={() => setFoundUser(null)} />
            )}
          </div>

          {/* ===== DETALLE DE COMPRA ===== */}
          <div>
            <h3 className="font-semibold text-white mb-4">2. Detalle de la compra</h3>

            <div className={`space-y-5 ${!foundUser ? 'opacity-35 pointer-events-none' : ''}`}>

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
                        className="p-4 rounded-xl text-left transition-all active:scale-95"
                        style={{
                          background: isActive ? pm.activeBg : 'rgba(255,255,255,0.04)',
                          border: `2px solid ${isActive ? pm.activeBorder : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        <span className="text-2xl block mb-1">{pm.icon}</span>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: isActive ? pm.activeText : 'rgba(240,244,236,0.50)' }}
                        >
                          {pm.label}
                        </p>
                        {pm.key === 'CASH' && (
                          <p className="text-xs mt-0.5 font-medium" style={{ color: '#9de360' }}>
                            ✨ Puntos base dobles
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

              {/* ===== MULTIPLICADOR DE PUNTOS ===== */}
              <div>
                <label className="label">
                  Multiplicador de puntos{' '}
                  <span style={{ color: 'rgba(240,244,236,0.35)', fontWeight: 400 }}>
                    — para promociones especiales
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {MULTIPLIERS.map(m => {
                    const isActive = multiplier === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMultiplier(m.value)}
                        className="py-3 px-2 rounded-xl text-center transition-all active:scale-95"
                        style={{
                          background: isActive ? m.color : 'rgba(255,255,255,0.04)',
                          border: `2px solid ${isActive ? m.border : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        <p
                          className="font-mono font-black text-lg"
                          style={{ color: isActive ? m.text : 'rgba(240,244,236,0.45)' }}
                        >
                          {m.label}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: isActive ? m.text : 'rgba(240,244,236,0.30)' }}
                        >
                          {m.sublabel}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Indicador visual si hay multiplicador activo */}
                {multiplier > 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 px-3 py-2 rounded-lg flex items-center gap-2"
                    style={{
                      background: 'rgba(139,92,246,0.10)',
                      border: '1px solid rgba(139,92,246,0.20)',
                    }}
                  >
                    <span>🔥</span>
                    <p className="text-xs font-medium" style={{ color: '#c4b5fd' }}>
                      Multiplicador x{multiplier} activo — los puntos se multiplicarán por {multiplier}
                    </p>
                  </motion.div>
                )}
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
                  placeholder="Ej: Compra de limpieza x2, promoción navidad..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {/* Botón registrar */}
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
                  : `✓ Registrar${multiplier > 1 ? ` (x${multiplier} pts)` : ''} ${paymentMethod === 'CASH' ? '💵' : '📲'}`
                }
              </button>
            </div>

            {!foundUser && (
              <p className="text-center text-sm mt-4" style={{ color: 'rgba(240,244,236,0.28)' }}>
                Escaneá el QR o ingresá el DNI del cliente primero
              </p>
            )}
          </div>
        </div>

        {/* Tabla compras recientes */}
        {purchases.length > 0 && (
          <div>
            <h3 className="font-display font-semibold text-xl text-white mb-4">Compras recientes</h3>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['Cliente', 'Pago', 'Monto', 'Puntos', 'Números', 'Fecha'].map(h => (
                        <th
                          key={h}
                          className={`px-4 py-3 text-xs font-medium uppercase tracking-wider ${h === 'Cliente' ? 'text-left' : 'text-right'} ${h === 'Pago' ? 'text-center' : ''}`}
                          style={{ color: 'rgba(240,244,236,0.35)' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map(p => (
                      <tr
                        key={p.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-white">{p.user?.name}</p>
                          <p className="text-xs" style={{ color: 'rgba(240,244,236,0.35)' }}>{p.user?.dni}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="badge text-xs"
                            style={p.paymentMethod === 'CASH'
                              ? { background: 'rgba(92,181,22,0.12)', color: '#9de360', border: '1px solid rgba(92,181,22,0.25)' }
                              : { background: 'rgba(245,158,11,0.12)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.25)' }
                            }
                          >
                            {p.paymentMethod === 'CASH' ? '💵 Efectivo' : '📲 Transfer'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium" style={{ color: '#9de360' }}>
                          ${p.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: '#fde68a' }}>
                          +{p.points}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {p.numbers?.length > 0
                            ? <span style={{ color: '#9de360' }}>+{p.numbers.length}</span>
                            : <span style={{ color: 'rgba(240,244,236,0.20)' }}>—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right text-xs" style={{ color: 'rgba(240,244,236,0.35)' }}>
                          {new Date(p.createdAt).toLocaleString('es-AR', {
                            day: 'numeric', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}