"""Dependências do FastAPI: repositório e usuário autenticado."""

from dataclasses import dataclass
from functools import lru_cache

from fastapi import Depends, Header, HTTPException, status

from .config import get_settings
from .repositories.base import Repository
from .repositories.memory import MemoryRepository
from .services.auth import ler_token


@lru_cache
def get_repo() -> Repository:
    settings = get_settings()
    if settings.demo:
        from .seed import seed_memory

        return seed_memory(MemoryRepository())

    from .repositories.postgres import PostgresRepository

    repo = PostgresRepository(settings.database_url)
    repo.migrate()  # cria/atualiza as tabelas na primeira requisição de cada instância
    return repo


@dataclass
class CurrentUser:
    id: str
    role: str

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def get_current_user(
    authorization: str | None = Header(default=None),
    repo: Repository = Depends(get_repo),
) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Faça login para continuar")
    user_id = ler_token(authorization.split(" ", 1)[1].strip())
    perfil = repo.get_profile(user_id)
    if not perfil:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Conta não encontrada")
    if not perfil["ativo"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Conta desativada pelo administrador")
    return CurrentUser(id=perfil["id"], role=perfil["role"])


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Apenas administradores")
    return user
