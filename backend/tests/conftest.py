"""Fixtures dos testes.

Por padrão os testes usam o repositório em memória. Com a variável
TEST_DATABASE_URL apontando para um PostgreSQL vazio, os mesmos testes rodam
também contra o banco de verdade (o esquema é recriado a cada teste).
"""

import os

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.deps import get_repo
from app.main import app
from app.repositories.memory import MemoryRepository
from app.seed import ADMIN, EMAILS_DEMO, PRODUTOR_1, PRODUTOR_2, SENHA_DEMO_HASH, seed_catalogo, seed_memory
from app.services.auth import criar_token

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
BACKENDS = ["memoria"] + (["postgres"] if TEST_DATABASE_URL else [])


@pytest.fixture(autouse=True)
def _modo_demo(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.setenv("JWT_SECRET", "")
    monkeypatch.setenv("ADMIN_EMAILS", "chefe@feiraviva.com")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _postgres_repo():
    from app.repositories.postgres import PostgresRepository

    repo = _postgres_repo.cache = getattr(_postgres_repo, "cache", None) or PostgresRepository(TEST_DATABASE_URL)
    with repo.pool.connection() as conn:
        conn.execute("drop schema public cascade; create schema public;")
    repo.migrate()
    with repo.pool.connection() as conn:
        conn.execute("delete from fairs")  # o seed de teste cria as próprias feiras
        perfis = {
            PRODUTOR_1: ("José Ribeiro", "Sítio Boa Esperança", "5586999990001", "produtor"),
            PRODUTOR_2: ("Maria Sousa", "Banca da Dona Maria", "5586999990002", "produtor"),
            ADMIN: ("Administrador", "", None, "admin"),
        }
        for user_id, (nome, banca, zap, role) in perfis.items():
            conn.execute(
                "insert into users (id, email, senha_hash) values (%s, %s, %s)",
                (user_id, EMAILS_DEMO[user_id], SENHA_DEMO_HASH),
            )
            conn.execute(
                "insert into profiles (id, nome, nome_banca, cidade, whatsapp, role) values (%s,%s,%s,%s,%s,%s)",
                (user_id, nome, banca, "Teresina", zap, role),
            )
    seed_catalogo(repo)
    return repo


@pytest.fixture(params=BACKENDS)
def repo(request):
    if request.param == "postgres":
        return _postgres_repo()
    return seed_memory(MemoryRepository())


@pytest.fixture
def client(repo):
    app.dependency_overrides[get_repo] = lambda: repo
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def auth(user_id: str) -> dict:
    return {"Authorization": f"Bearer {criar_token(user_id)}"}


@pytest.fixture
def produtor1():
    return auth(PRODUTOR_1)


@pytest.fixture
def produtor2():
    return auth(PRODUTOR_2)


@pytest.fixture
def admin():
    return auth(ADMIN)


@pytest.fixture(scope="session", autouse=True)
def _fecha_pool():
    yield
    repo = getattr(_postgres_repo, "cache", None)
    if repo:
        repo.pool.close()
