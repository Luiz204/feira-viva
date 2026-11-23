"""Cadastro, login e tokens JWT (RF01, RF02, RNF04)."""

from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from ..config import get_settings
from ..repositories.base import Repository, Row
from .errors import DomainError, Forbidden, Invalid

ALGORITMO = "HS256"


class Unauthorized(DomainError):
    status_code = 401


def hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt(rounds=12)).decode()


def senha_confere(senha: str, senha_hash: str) -> bool:
    try:
        return bcrypt.checkpw(senha.encode(), senha_hash.encode())
    except ValueError:
        return False


def criar_token(user_id: str) -> str:
    settings = get_settings()
    agora = datetime.now(UTC)
    payload = {"sub": user_id, "iat": agora, "exp": agora + timedelta(days=settings.jwt_dias)}
    return jwt.encode(payload, settings.secret, algorithm=ALGORITMO)


def ler_token(token: str) -> str:
    try:
        payload = jwt.decode(token, get_settings().secret, algorithms=[ALGORITMO])
    except jwt.ExpiredSignatureError as exc:
        raise Unauthorized("Sessão expirada, entre novamente") from exc
    except jwt.InvalidTokenError as exc:
        raise Unauthorized("Token inválido") from exc
    return str(payload["sub"])


def cadastrar(repo: Repository, nome: str, email: str, senha: str) -> tuple[str, Row]:
    email = email.strip().lower()
    if repo.get_user_by_email(email):
        raise Invalid("Já existe uma conta com este e-mail")
    role = "admin" if email in get_settings().admin_list else "produtor"
    perfil = repo.create_user(email=email, senha_hash=hash_senha(senha), nome=nome.strip(), role=role)
    return criar_token(perfil["id"]), perfil


def entrar(repo: Repository, email: str, senha: str) -> tuple[str, Row]:
    usuario = repo.get_user_by_email(email.strip().lower())
    # mesma mensagem para e-mail inexistente e senha errada: não revela quais e-mails existem
    if not usuario or not senha_confere(senha, usuario["senha_hash"]):
        raise Unauthorized("E-mail ou senha incorretos")
    perfil = repo.get_profile(usuario["id"])
    if not perfil or not perfil["ativo"]:
        raise Forbidden("Conta desativada pelo administrador")
    return criar_token(perfil["id"]), perfil
