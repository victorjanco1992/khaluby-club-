import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { motion } from 'framer-motion';

export default function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const streamRef = useRef(null);
  const scannedRef = useRef(false); // evitar doble disparo
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [status, setStatus] = useState('starting');
  const [error, setError] = useState(null);

  const stopAll = useCallback(() => {
    try { readerRef.current?.reset(); } catch {}
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    } catch {}
  }, []);

  const handleClose = useCallback(() => {
    stopAll();
    onClose();
  }, [stopAll, onClose]);

  const handleScan = useCallback((text) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    stopAll();
    onScan(text);
  }, [stopAll, onScan]);

  // Inicializar cámara
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });

        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (cancelled) return;

        if (devices.length === 0) {
          setError('No se encontró ninguna cámara');
          setStatus('error');
          return;
        }

        setCameras(devices);

        const back = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('trasera') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        setSelectedCamera(back?.deviceId || devices[devices.length - 1].deviceId);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        if (err.name === 'NotAllowedError') {
          setError('Permiso de cámara denegado. Habilitá el acceso en el navegador.');
        } else {
          setError('No se pudo acceder a la cámara: ' + err.message);
        }
        setStatus('error');
      }
    }

    init();
    return () => {
      cancelled = true;
      stopAll();
    };
  }, []);

  // Iniciar lector QR
  useEffect(() => {
    if (!selectedCamera || !videoRef.current || status !== 'ready') return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromVideoDevice(selectedCamera, videoRef.current, (result, err) => {
        if (result) {
          handleScan(result.getText());
        }
      })
      .catch(e => {
        setError('Error al iniciar escáner: ' + e.message);
        setStatus('error');
      });

    return () => {
      try { reader.reset(); } catch {}
    };
  }, [selectedCamera, status, handleScan]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: '#000' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ height: '60px', background: 'rgba(0,0,0,0.85)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div>
          <p className="font-semibold text-white">Escanear QR del cliente</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Apuntá la cámara al código QR
          </p>
        </div>
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.10)', color: '#fff', fontSize: '18px' }}
        >
          ✕
        </button>
      </div>

      {/* Video */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {/* Iniciando */}
        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.90)' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-10 h-10 rounded-full border-2 mb-3"
              style={{ borderColor: 'rgba(92,181,22,0.20)', borderTopColor: '#5cb516' }}
            />
            <p className="text-white text-sm">Iniciando cámara...</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.92)' }}>
            <div className="text-5xl mb-4">📷</div>
            <p className="text-white font-semibold text-center mb-2">Sin acceso a la cámara</p>
            <p className="text-sm text-center mb-6" style={{ color: 'rgba(255,255,255,0.50)' }}>{error}</p>
            <button onClick={handleClose} className="btn-secondary px-8 py-3">Cerrar</button>
          </div>
        )}

        {/* Marco de escaneo */}
        {status === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.50)' }} />

            <div className="relative z-10" style={{ width: '240px', height: '240px' }}>
              <div
                className="absolute inset-0 rounded-2xl"
                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.50)' }}
              />
              {[
                { top: 0, left: 0, borderTop: '4px solid #5cb516', borderLeft: '4px solid #5cb516', borderTopLeftRadius: '12px' },
                { top: 0, right: 0, borderTop: '4px solid #5cb516', borderRight: '4px solid #5cb516', borderTopRightRadius: '12px' },
                { bottom: 0, left: 0, borderBottom: '4px solid #5cb516', borderLeft: '4px solid #5cb516', borderBottomLeftRadius: '12px' },
                { bottom: 0, right: 0, borderBottom: '4px solid #5cb516', borderRight: '4px solid #5cb516', borderBottomRightRadius: '12px' },
              ].map((style, i) => (
                <div key={i} className="absolute" style={{ ...style, width: '32px', height: '32px' }} />
              ))}
              <motion.div
                className="absolute left-3 right-3 rounded-full"
                style={{
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #5cb516, #9de360, #5cb516, transparent)',
                  boxShadow: '0 0 8px rgba(92,181,22,0.8)',
                }}
                animate={{ top: ['8%', '88%', '8%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            <p className="absolute text-sm font-medium"
              style={{
                bottom: 'calc(50% - 148px)',
                color: 'rgba(255,255,255,0.70)',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}>
              Centrá el QR dentro del marco
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 space-y-3"
        style={{ background: 'rgba(0,0,0,0.85)' }}>
        {cameras.length > 1 && (
          <select
            className="w-full rounded-xl px-4 py-3 text-sm text-white"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            value={selectedCamera || ''}
            onChange={e => {
              try { readerRef.current?.reset(); } catch {}
              setSelectedCamera(e.target.value);
            }}
          >
            {cameras.map(cam => (
              <option key={cam.deviceId} value={cam.deviceId} style={{ background: '#111' }}>
                {cam.label || `Cámara ${cam.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        )}
        <button onClick={handleClose} className="btn-secondary w-full py-3.5">Cancelar</button>
      </div>
    </div>
  );
}
