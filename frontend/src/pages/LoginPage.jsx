import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore.js';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ dni: '', password: '' });
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await login(form.dni, form.password);
      toast.success('¡Bienvenido!');
      navigate(result.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo tipo pizarra con acentos verdes */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 40%, rgba(92,181,22,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(245,158,11,0.05) 0%, transparent 50%)' }} />

      {/* Borde decorativo tipo cartel */}
      <div className="absolute inset-4 rounded-3xl pointer-events-none" style={{ border: '1px solid rgba(92,181,22,0.08)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          >
            {/* Hojas decorativas */}
            <h1 className="font-display font-black text-5xl mb-1">
              <span style={{ color: 'white' }}>DESPENSA</span>
            </h1>
            <h1 className="font-display font-black text-5xl gradient-text-green">
              KHALUBY
            </h1>
            <p className="text-sm mt-2 italic" style={{ color: 'rgba(240,244,236,0.45)' }}>
              Todo lo que necesitás, en un solo lugar.
            </p>
          </motion.div>
        </div>

        {/* Card */}
        <div className="card-glass p-8">
          <h2 className="font-display font-semibold text-xl text-white mb-5">Iniciá sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">DNI</label>
              <input
                type="text"
                className="input"
                placeholder="Tu número de DNI"
                value={form.dni}
                onChange={e => setForm({ ...form, dni: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                className="input"
                placeholder="Tu contraseña"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full py-4 text-base mt-2" disabled={isLoading}>
              {isLoading ? '⏳ Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-5 pt-5 text-center space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-sm" style={{ color: 'rgba(240,244,236,0.45)' }}>
              ¿No tenés cuenta?{' '}
              <Link to="/register" className="font-semibold transition-colors" style={{ color: '#9de360' }}>
                Registrate gratis
              </Link>
            </p>
            <Link to="/sorteo" className="text-xs transition-colors block" style={{ color: 'rgba(240,244,236,0.28)' }}>
              🎰 Ver sorteo en vivo
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}