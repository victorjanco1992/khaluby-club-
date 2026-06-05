import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';

function ConfigRow({ label, description, fieldKey, value, onChange, prefix = '$', suffix = '' }) {
  return (
    <div className="py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm">{label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(240,244,236,0.45)' }}>{description}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {prefix && <span className="text-sm" style={{ color: 'rgba(240,244,236,0.40)' }}>{prefix}</span>}
          <input
            type="number"
            min="0"
            step={prefix === '$' ? '100' : '1'}
            className="input text-center font-mono font-bold text-base"
            style={{ width: '90px', padding: '8px 10px' }}
            value={value}
            onChange={e => onChange(fieldKey, e.target.value)}
          />
          {suffix && <span className="text-sm" style={{ color: 'rgba(240,244,236,0.40)' }}>{suffix}</span>}
        </div>
      </div>
    </div>
  );
}

const SIMULATOR_AMOUNTS = [1000, 5000, 10000, 20000, 50000];

export default function AdminConfig() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['store-config'],
    queryFn: () => api.get('/api/admin/config').then(r => r.data.config),
  });

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (data && !form) {
      setForm({
        points_transfer_amount: data.pointsTransferAmount,
        points_transfer_per:    data.pointsTransferPer,
        points_cash_amount:     data.pointsCashAmount,
        points_cash_per:        data.pointsCashPer,
        raffle_amount_per_number: data.raffleAmountPerNumber,
        raffle_cash_bonus:        data.raffleCashBonus,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (d) => api.put('/api/admin/config', d),
    onSuccess: () => {
      toast.success('Configuración guardada');
      queryClient.invalidateQueries({ queryKey: ['store-config'] });
    },
    onError: () => toast.error('Error al guardar'),
  });

  const handleChange = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const previewConfig = form ? {
    pointsTransferAmount:  parseFloat(form.points_transfer_amount) || 1000,
    pointsTransferPer:     parseFloat(form.points_transfer_per) || 1,
    pointsCashAmount:      parseFloat(form.points_cash_amount) || 1000,
    pointsCashPer:         parseFloat(form.points_cash_per) || 2,
    raffleAmountPerNumber: parseFloat(form.raffle_amount_per_number) || 5000,
    raffleCashBonus:       parseInt(form.raffle_cash_bonus) || 1,
  } : null;

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(92,181,22,0.20)', borderTopColor: '#5cb516' }} />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Configuración</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(240,244,236,0.45)' }}>
          Ajustá las reglas de puntos y sorteos
        </p>
      </div>

      {/* Transferencia */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">📲</span>
          <div>
            <h2 className="font-semibold text-white text-sm">Puntos por Transferencia / QR / Débito</h2>
            <p className="text-xs" style={{ color: 'rgba(240,244,236,0.45)' }}>Pagos electrónicos</p>
          </div>
        </div>
        <ConfigRow
          label="Monto base"
          description="Cada cuántos pesos se otorga el punto"
          fieldKey="points_transfer_amount"
          value={form.points_transfer_amount}
          onChange={handleChange}
          prefix="$"
        />
        <ConfigRow
          label="Puntos otorgados"
          description="Cuántos puntos por cada monto base"
          fieldKey="points_transfer_per"
          value={form.points_transfer_per}
          onChange={handleChange}
          prefix=""
          suffix="pts"
        />
        <div className="mt-3 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'rgba(99,102,241,0.08)', color: 'rgba(196,181,253,0.80)' }}>
          📊 {form.points_transfer_per} pto cada ${parseFloat(form.points_transfer_amount || 0).toLocaleString()}
        </div>
      </motion.div>

      {/* Efectivo */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="card p-4" style={{ borderColor: 'rgba(92,181,22,0.18)' }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">💵</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-white text-sm">Puntos por Efectivo</h2>
            <p className="text-xs" style={{ color: 'rgba(240,244,236,0.45)' }}>Beneficio adicional</p>
          </div>
          <span className="badge text-xs flex-shrink-0"
            style={{ background: 'rgba(92,181,22,0.15)', color: '#9de360', border: '1px solid rgba(92,181,22,0.25)' }}>
            ✨ Bonus
          </span>
        </div>
        <ConfigRow
          label="Monto base"
          description="Cada cuántos pesos se otorgan los puntos"
          fieldKey="points_cash_amount"
          value={form.points_cash_amount}
          onChange={handleChange}
          prefix="$"
        />
        <ConfigRow
          label="Puntos otorgados"
          description="Cuántos puntos (recomendado: el doble)"
          fieldKey="points_cash_per"
          value={form.points_cash_per}
          onChange={handleChange}
          prefix=""
          suffix="pts"
        />
        <div className="mt-3 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'rgba(92,181,22,0.08)', color: '#9de360' }}>
          📊 {form.points_cash_per} pts cada ${parseFloat(form.points_cash_amount || 0).toLocaleString()}
        </div>
      </motion.div>

      {/* Sorteos */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="card p-4" style={{ borderColor: 'rgba(92,181,22,0.15)' }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🎰</span>
          <div>
            <h2 className="font-semibold text-white text-sm">Números de Sorteo</h2>
            <p className="text-xs" style={{ color: 'rgba(240,244,236,0.45)' }}>Por compra</p>
          </div>
        </div>
        <ConfigRow
          label="Monto por número"
          description="Cada cuántos pesos se otorga 1 número"
          fieldKey="raffle_amount_per_number"
          value={form.raffle_amount_per_number}
          onChange={handleChange}
          prefix="$"
        />
        <ConfigRow
          label="Bonus efectivo"
          description="Números extra cuando paga en efectivo"
          fieldKey="raffle_cash_bonus"
          value={form.raffle_cash_bonus}
          onChange={handleChange}
          prefix=""
          suffix="extra"
        />
        <div className="mt-3 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'rgba(92,181,22,0.06)', color: '#9de360' }}>
          📊 Efectivo: base + {form.raffle_cash_bonus} número(s) extra
        </div>
      </motion.div>

      {/* Guardar */}
      <button
        onClick={() => saveMutation.mutate(form)}
        disabled={saveMutation.isPending}
        className="btn-primary w-full py-4 text-base"
      >
        {saveMutation.isPending ? '⏳ Guardando...' : '✓ Guardar configuración'}
      </button>

      {/* Simulador */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="card p-4">
        <h3 className="font-semibold text-white mb-1">Simulador</h3>
        <p className="text-xs mb-4" style={{ color: 'rgba(240,244,236,0.45)' }}>
          Resultado con la configuración actual
        </p>

        {/* Header */}
        <div className="grid grid-cols-3 gap-2 pb-2 mb-1"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-medium" style={{ color: 'rgba(240,244,236,0.40)' }}>Compra</p>
          <p className="text-xs font-medium text-center" style={{ color: '#fde68a' }}>📲 Transfer</p>
          <p className="text-xs font-medium text-center" style={{ color: '#9de360' }}>💵 Efectivo</p>
        </div>

        {/* Filas */}
        {previewConfig && SIMULATOR_AMOUNTS.map(amt => {
          const transferPts = Math.floor(amt / previewConfig.pointsTransferAmount) * previewConfig.pointsTransferPer;
          const cashPts = Math.floor(amt / previewConfig.pointsCashAmount) * previewConfig.pointsCashPer;
          const baseNums = Math.floor(amt / previewConfig.raffleAmountPerNumber);
          const cashNums = baseNums > 0 ? baseNums + previewConfig.raffleCashBonus : 0;

          return (
            <div key={amt} className="grid grid-cols-3 gap-2 py-2.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="font-mono text-sm text-white">${amt.toLocaleString()}</p>
              <div className="text-center">
                <p className="font-mono font-bold text-sm" style={{ color: '#fde68a' }}>{transferPts}pts</p>
                <p className="text-xs" style={{ color: 'rgba(240,244,236,0.35)' }}>{baseNums} núm.</p>
              </div>
              <div className="text-center">
                <p className="font-mono font-bold text-sm" style={{ color: '#9de360' }}>{cashPts}pts</p>
                <p className="text-xs" style={{ color: '#9de360' }}>{cashNums} núm.</p>
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
