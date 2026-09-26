export function enviarError(res, status, mensaje) {
  res.status(status).json({ error: mensaje });
}

export function campo(body, camel, snake) {
  const valor = body[camel] ?? body[snake];
  return typeof valor === "string" ? valor.trim() : valor;
}

export function manejar(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      enviarError(res, error.status ?? 500, error.message);
    }
  };
}
