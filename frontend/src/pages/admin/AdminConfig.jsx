import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';

function ConfigRow({ label, description, fieldKey, value, onChange, prefix = '$', suffix = '' }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm">{label}</p>
        <p className="text-white/40 text-xs mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {prefix && <span className="text-white/35 text-sm">{prefix}</span>}
        <input
          type="number"
          min="0"
          step={prefix === '$' ? '500' : '1'}
          className="input text-center font-mono font-bold text-lg w-28"
          value={value}
          onChange={e => onChange(fieldKey, e.target.value)}
        />
        {suffix && <span className="text-white/35 text-sm">{suffix}</span>}
      </div>
    </div>
  );
}

function SimulatorRow({ amount, config }) {
  if (!config) return null;

  const transferPoints = Math.floor(amount / config.pointsTransferAmount) * config.pointsTransferPer;
  const cashPoints = Math.floor(amount / config.pointsCashAmount) * config.pointsCashPer;
  const baseNumbers = Math.floor(amount / config.raffleAmountPerNumber);
  const cashNumbers = baseNumbers > 0 ? baseNumbers + config.raffleCashBonus : 0;

  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <td className="py-3 px-4 font-mono text-white/70 text-sm">${amount.toLocaleString()}</td>
      <td className="py-3 px-4 text-center">
        <span className="font-mono font-bold text-indigo-300">{transferPoints} pts</span>
        <span className="text-white/30 text-xs block">{baseNumbers} números</span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className="font-mono font-bold text-emerald-300">{cashPoints} pts</span>
        <span className="text-emerald-400 text-xs block">{cashNumbers} números</span>
      </td>
    </tr>
  );
}

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

  const handleChange = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  // Config preview en tiempo real con valores del form
  const previewConfig = form ? {
    pointsTransferAmount: parseFloat(form.points_transfer_amount) || 1000,
    pointsTransferPer:    parseFloat(form.points_transfer_per) || 1,
    pointsCashAmount:     parseFloat(form.points_cash_amount) || 1000,
    pointsCashPer:        parseFloat(form.points_cash_per) || 2,
    raffleAmountPerNumber: parseFloat(form.raffle_amount_per_number) || 5000,
    raffleCashBonus:       parseInt(form.raffle_cash_bonus) || 1,
  } : null;

  const SIMULATOR_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

  if (isLoading || !form) {
    return <div className="text-white/40 text-center py-20">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display font-bold text-3xl text-white">Configuración</h1>
        <p className="text-white/45 mt-1">Ajustá las reglas de puntos y sorteos según tu estrategia comercial</p>
      </div>

      {/* Puntos — Transferencia */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📲</span>
          <div>
            <h2 className="font-semibold text-white">Puntos por Transferencia / QR / Débito</h2>
            <p className="text-white/40 text-sm">Regla base para pagos electrónicos</p>
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
          description="Cuántos puntos se dan por cada monto base"
          fieldKey="points_transfer_per"
          value={form.points_transfer_per}
          onChange={handleChange}
          prefix=""
          suffix="pts"
        />
        <div className="mt-3 px-3 py-2 rounded-lg text-xs text-white/40"
          style={{ background: 'rgba(99,102,241,0.08)' }}>
          📊 Resultado: {form.points_transfer_per} pto cada ${parseFloat(form.points_transfer_amount || 0).toLocaleString()}
        </div>
      </motion.div>

      {/* Puntos — Efectivo */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-6"
        style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">💵</span>
          <div>
            <h2 className="font-semibold text-white">Puntos por Efectivo</h2>
            <p className="text-white/40 text-sm">Beneficio adicional para incentivar el efectivo</p>
          </div>
          <span className="ml-auto px-2 py-1 rounded-full text-xs font-medium"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }}>
            ✨ Beneficio
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
          description="Cuántos puntos se dan por cada monto base (recomendado: el doble)"
          fieldKey="points_cash_per"
          value={form.points_cash_per}
          onChange={handleChange}
          prefix=""
          suffix="pts"
        />
        <div className="mt-3 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'rgba(16,185,129,0.08)', color: '#6ee7b7' }}>
          📊 Resultado: {form.points_cash_per} pts cada ${parseFloat(form.points_cash_amount || 0).toLocaleString()}
        </div>
      </motion.div>

      {/* Sorteos */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6"
        style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🎰</span>
          <div>
            <h2 className="font-semibold text-white">Números de Sorteo</h2>
            <p className="text-white/40 text-sm">Cuántos números se asignan por compra</p>
          </div>
        </div>
        <ConfigRow
          label="Monto por número"
          description="Cada cuántos pesos de compra se otorga 1 número"
          fieldKey="raffle_amount_per_number"
          value={form.raffle_amount_per_number}
          onChange={handleChange}
          prefix="$"
        />
        <ConfigRow
          label="Bonus por efectivo"
          description="Números extra adicionales al total cuando el pago es en efectivo"
          fieldKey="raffle_cash_bonus"
          value={form.raffle_cash_bonus}
          onChange={handleChange}
          prefix=""
          suffix="extra"
        />
        <div className="mt-3 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'rgba(139,92,246,0.08)', color: '#c4b5fd' }}>
          📊 Efectivo: base + {form.raffle_cash_bonus} número(s) extra por compra
        </div>
      </motion.div>

      {/* Botón guardar */}
      <button
        onClick={() => saveMutation.mutate(form)}
        disabled={saveMutation.isPending}
        className="btn-primary px-10 py-4 text-base"
      >
        {saveMutation.isPending ? '⏳ Guardando...' : '✓ Guardar configuración'}
      </button>

      {/* Simulador */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card p-6">
        <h3 className="font-semibold text-lg text-white mb-1">Simulador</h3>
        <p className="text-white/40 text-sm mb-5">
          Resultado con la configuración actual (los cambios sin guardar también se reflejan acá)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th className="py-3 px-4 text-left text-white/35 text-xs font-medium uppercase">Compra</th>
                <th className="py-3 px-4 text-center text-white/35 text-xs font-medium uppercase">
                  📲 Transferencia
                </th>
                <th className="py-3 px-4 text-center text-white/35 text-xs font-medium uppercase">
                  💵 Efectivo
                </th>
              </tr>
            </thead>
            <tbody>
              {SIMULATOR_AMOUNTS.map(amt => (
                <SimulatorRow key={amt} amount={amt} config={previewConfig} />
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}