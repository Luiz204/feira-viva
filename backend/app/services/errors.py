class DomainError(Exception):
    """Erro de regra de negócio, convertido em resposta HTTP pela API."""

    status_code = 400

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFound(DomainError):
    status_code = 404


class Forbidden(DomainError):
    status_code = 403


class Invalid(DomainError):
    status_code = 422
