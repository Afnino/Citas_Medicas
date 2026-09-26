export class ErrorDominio extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.name = "ErrorDominio";
    this.status = status;
  }
}

export class ErrorInfraestructura extends Error {
  constructor(mensaje, status = 500) {
    super(mensaje);
    this.name = "ErrorInfraestructura";
    this.status = status;
  }
}
