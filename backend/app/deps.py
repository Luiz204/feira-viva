"""Dependências do FastAPI: repositório e usuário autenticado."""

from dataclasses import dataclass
from functools import lru_cache

from fastapi import Depends, Header, HTTPException, status

from .config import get_settings
from .repositories.base import Repository
from .repositories.memory import MemoryRepository


@lru_cache
def get_repo() -> Repository:
    settings = get_settings()
    if settings.use_supabase:
        from .repositories.supabase_repo import SupabaseRepository

        return SupabaseRepository(settings.supabase_url, settings.supabase_service_role_key)
    from .seed import seed_memory

    return seed_memory(MemoryRepository())


@dataclass
class CurrentUser:
    id: str
    role: str

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def _user_id_from_token(token: str) -> str:
    settings = get_settings()
    if not settings.use_supabase:
        # Modo demonstração sem Supabase: o token é "dev:<id do perfil>".
        if token.startswith("dev:"):
            return token[4:]
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido")

    repo = get_repo()
    try:
        resposta = repo.client.auth.get_user(token)  # type: ignore[attr-defined]
    except Exception as exc:  # token expirado, assinatura inválida etc.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão expirada, entre novamente") from exc
    if not resposta or not resposta.user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido")
    return resposta.user.id


def get_current_user(
    authorization: str | None = Header(default=None),
    repo: Repository = Depends(get_repo),
) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Faça login para continuar")
    user_id = _user_id_from_token(authorization.split(" ", 1)[1].strip())
    perfil = repo.get_profile(user_id)
    if not perfil:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Perfil não encontrado")
    if not perfil["ativo"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Conta desativada pelo administrador")
    return CurrentUser(id=perfil["id"], role=perfil["role"])


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Apenas administradores")
    return user
