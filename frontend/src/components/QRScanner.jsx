import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { motion } from 'framer-motion';

export default function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [status, setStatus] = useState('starting'); // starting | ready | error

  // Pedir permiso y listar cámaras
  useEffect(() => {
    async function init() {
      try {
        // Pedir permiso de cámara primero
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;

        // Listar cámaras disponibles
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();

        if (devices.length === 0) {
          setError('No se encontró ninguna cámara');
          setStatus('error');
          return;
        }

        setCameras(devices);

        // Preferir cámara trasera
        const back = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('trasera') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment') ||
          d.label.toLowerCase().includes('0,')
        );

        setSelectedCamera(back?.deviceId || devices[devices.length - 1].deviceId);
        setStatus('ready');
      } catch (err) {
        console.error('Camera error:', err);
        if (err.name === 'NotAllowedError') {
          setError('Permiso de cámara denegado. Habilitá el acceso en la configuración del navegador.');
        } else if (err.name === 'NotFoundError') {
          setError('No se encontró ninguna cámara en este dispositivo.');
        } else {
          setError('No se pudo acceder a la cámara: ' + err.message);
        }
        setStatus('error');
      }
    }

    init();

    return () => {
      // Detener stream al desmontar
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      readerRef.current?.reset();
    };
  }, []);

  // Iniciar lector cuando se selecciona cámara
  useEffect(() => {
    if (!selectedCamera || !videoRef.current || status !== 'ready') return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    // Detener stream previo
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    reader
      .decodeFromVideoDevice(selectedCamera, videoRef.current, (result, err) => {
        if (result) {
          const text = result.getText();
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          onScan(text);
        }
        if (err && err.name !== 'NotFoundException') {
          console.warn('Scan error:', err.name);
        }
      })
      .catch(e => {
        setError('Error al iniciar escáner: ' + e.message);
        setStatus('error');
      });

    return () => {
      reader.reset();
    };
  }, [selectedCamera, status]);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: '#000' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{
          height: '60px',
          background: 'rgba(0,0,0,0.80)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div>
          <p className="font-semibold text-white text-base">Escanear QR</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Apuntá la cámara al código QR del cliente
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-light"
          style={{ background: 'rgba(255,255,255,0.10)', color: '#fff' }}
        >
          ✕
        </button>
      </div>

      {/* Video */}
      <div className="flex-1 relative overflow-hidden">
        {/* El video — playsInline es CRÍTICO para iOS/Android */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {/* Estado: iniciando */}
        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-10 h-10 rounded-full border-2 mb-4"
              style={{ borderColor: 'rgba(92,181,22,0.20)', borderTopColor: '#5cb516' }}
            />
            <p className="text-white text-sm">Iniciando cámara...</p>
          </div>
        )}

        {/* Estado: error */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.90)' }}>
            <div className="text-5xl mb-4">📷</div>
            <p className="text-white font-semibold text-center mb-2">
              No se pudo acceder a la cámara
            </p>
            <p className="text-sm text-center mb-6" style={{ color: 'rgba(255,255,255,0.50)' }}>
              {error}
            </p>
            <button onClick={onClose} className="btn-secondary px-8 py-3">
              Cerrar
            </button>
          </div>
        )}

        {/* Overlay con marco — solo cuando está ready */}
        {status === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Oscurecer bordes */}
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.50)' }}
            />

            {/* Marco del QR */}
            <div className="relative z-10" style={{ width: '240px', height: '240px' }}>
              {/* Fondo transparente en el centro — sobreescribe el overlay */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.50)', background: 'transparent' }}
              />

              {/* Esquinas verdes */}
              {[
                { top: 0, left: 0, borderTop: '4px solid #5cb516', borderLeft: '4px solid #5cb516', borderTopLeftRadius: '12px' },
                { top: 0, right: 0, borderTop: '4px solid #5cb516', borderRight: '4px solid #5cb516', borderTopRightRadius: '12px' },
                { bottom: 0, left: 0, borderBottom: '4px solid #5cb516', borderLeft: '4px solid #5cb516', borderBottomLeftRadius: '12px' },
                { bottom: 0, right: 0, borderBottom: '4px solid #5cb516', borderRight: '4px solid #5cb516', borderBottomRightRadius: '12px' },
              ].map((style, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{ ...style, width: '32px', height: '32px' }}
                />
              ))}

              {/* Línea de escaneo animada */}
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

            {/* Texto debajo del marco */}
            <p
              className="absolute text-sm font-medium"
              style={{
                bottom: 'calc(50% - 150px)',
                color: 'rgba(255,255,255,0.70)',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}
            >
              Centrá el QR dentro del marco
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex-shrink-0 p-4 space-y-3"
        style={{ background: 'rgba(0,0,0,0.85)' }}
      >
        {/* Selector de cámara si hay más de una */}
        {cameras.length > 1 && (
          <select
            className="w-full rounded-xl px-4 py-3 text-sm text-white"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            value={selectedCamera || ''}
            onChange={e => {
              readerRef.current?.reset();
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

        <button
          onClick={onClose}
          className="btn-secondary w-full py-3.5 text-base"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
