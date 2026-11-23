from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_JWT_SECRET = "dev-secret-somente-para-demonstracao"


class Settings(BaseSettings):
    """Configuração lida de variáveis de ambiente (ou do arquivo .env)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = ""
    jwt_secret: str = ""
    jwt_dias: int = 7
    admin_emails: str = ""  # e-mails que viram admin ao se cadastrar, separados por vírgula
    cors_origins: str = "http://localhost:5173"

    @property
    def demo(self) -> bool:
        """Sem DATABASE_URL a API roda com dados de exemplo em memória."""
        return not self.database_url

    @property
    def secret(self) -> str:
        if self.jwt_secret:
            return self.jwt_secret
        if self.demo:
            return DEV_JWT_SECRET
        raise RuntimeError("Defina JWT_SECRET quando usar um banco de verdade")

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def admin_list(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
