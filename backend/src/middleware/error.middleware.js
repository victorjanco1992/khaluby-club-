export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Ya existe un registro con ese valor' });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }

  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
};