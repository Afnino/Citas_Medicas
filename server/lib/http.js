export function enviarError(res, status, mensaje) {
  res.status(status).json({ error: mensaje });
}

export function campo(body, camel, snake) {
  const valor = body[camel] ?? body[snake];
  return typeof valor === "string" ? valor.trim() : valor;
}
