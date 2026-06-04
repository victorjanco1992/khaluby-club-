import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore.js';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', dni: '', phone: '', email: '', password: '', confirmPassword: '',
  });
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return toast.error('Las contraseñas no coinciden');
    }
    try {
      await register({
        name: form.name, dni: form.dni, phone: form.phone,
        email: form.email, password: form.password,
      });
      toast.success('¡Cuenta creada! Bienvenido 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrarse');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-700" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-khaluby-500/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="font-display font-bold text-3xl gradient-text">¡Unite a Khaluby!</h1>
          <p className="text-white/40 mt-1 text-sm">Puntos en cada compra · Sorteos exclusivos</p>
        </div>

        <div className="card-glass p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nombre completo</label>
              <input type="text" className="input" placeholder="Juan García" value={form.name} onChange={set('name')} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">DNI</label>
                <input type="text" className="input" placeholder="30123456" value={form.dni} onChange={set('dni')} required />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input type="tel" className="input" placeholder="2614001234" value={form.phone} onChange={set('phone')} required />
              </div>
            </div>
            <div>
              <label className="label">Email (opcional)</label>
              <input type="email" className="input" placeholder="juan@ejemplo.com" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input type="password" className="input" placeholder="Mínimo 6 caracteres" value={form.password} onChange={set('password')} required />
            </div>
            <div>
              <label className="label">Confirmar contraseña</label>
              <input type="password" className="input" placeholder="Repetí tu contraseña" value={form.confirmPassword} onChange={set('confirmPassword')} required />
            </div>
            <button type="submit" className="btn-primary w-full mt-2" disabled={isLoading}>
              {isLoading ? '⏳ Creando cuenta...' : '🚀 Crear mi cuenta'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-white/5 text-center">
            <p className="text-white/40 text-sm">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="text-khaluby-400 hover:text-khaluby-300 font-medium">
                Iniciá sesión
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}