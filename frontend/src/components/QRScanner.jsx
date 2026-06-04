import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { motion, AnimatePresence } from 'framer-motion';

export default function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [error, setError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [lastScan, setLastScan] = useState(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    BrowserMultiFormatReader.listVideoInputDevices()
      .then(devices => {
        if (devices.length === 0) {
          setError('No se encontró ninguna cámara');
          return;
        }
        setCameras(devices);
        const back = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('trasera') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        setSelectedCamera(back?.deviceId || devices[0].deviceId);
      })
      .catch(() => setError('No se pudo acceder a la cámara. Permitir acceso en el navegador.'));

    return () => {
      readerRef.current?.reset();
    };
  }, []);

  useEffect(() => {
    if (!selectedCamera || !videoRef.current) return;

    setError(null);

    readerRef.current
      .decodeFromVideoDevice(selectedCamera, videoRef.current, (result, err) => {
        if (result) {
          const text = result.getText();
          if (text === lastScan) return;
          setLastScan(text);

          if (navigator.vibrate) navigator.vibrate(150);

          onScan(text);
          setTimeout(() => setLastScan(null), 2000);
        }
        // No mostramos error por NotFoundException — es normal cuando no hay QR en cámara
        // Solo mostramos errores reales
        if (err && err.name !== 'NotFoundException') {
          console.warn('Scanner error:', err.name);
        }
      })
      .catch(e => {
        setError('Error al iniciar la cámara: ' + e.message);
      });

    return () => {
      readerRef.current?.reset();
    };
  }, [selectedCamera]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#000' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 z-10"
        style={{ background: 'rgba(0,0,0,0.7)' }}
      >
        <div>
          <p className="font-semibold text-white">Escanear QR del cliente</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.50)' }}>
            Apuntá la cámara al código QR
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          ✕
        </button>
      </div>

      {/* Video */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
        />

        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />

          {/* Marco */}
          <div className="relative z-10 w-64 h-64">
            <div
              className="absolute inset-0 rounded-2xl"
              style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
            />

            {/* Esquinas */}
            {[
              'top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl',
              'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl',
              'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl',
              'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl',
            ].map((cls, i) => (
              <div
                key={i}
                className={`absolute w-8 h-8 ${cls}`}
                style={{ borderColor: '#5cb516' }}
              />
            ))}

            {/* Línea de escaneo */}
            <motion.div
              className="absolute left-2 right-2 h-0.5 rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, #5cb516, transparent)' }}
              animate={{ top: ['10%', '90%', '10%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="absolute bottom-24 left-4 right-4 p-4 rounded-2xl text-center text-sm"
            style={{
              background: 'rgba(239,68,68,0.20)',
              border: '1px solid rgba(239,68,68,0.40)',
              color: '#fca5a5',
            }}
          >
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="p-4 space-y-3"
        style={{ background: 'rgba(0,0,0,0.85)' }}
      >
        {cameras.length > 1 && (
          <select
            className="w-full rounded-xl px-3 py-2 text-sm text-white"
            style={{
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
            value={selectedCamera || ''}
            onChange={e => setSelectedCamera(e.target.value)}
          >
            {cameras.map(cam => (
              <option key={cam.deviceId} value={cam.deviceId} style={{ background: '#111' }}>
                {cam.label || `Cámara ${cam.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        )}

        <button onClick={onClose} className="btn-secondary w-full py-3">
          Cancelar
        </button>
      </div>
    </motion.div>
  );
}