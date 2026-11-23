import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.deps import get_repo
from app.main import app
from app.repositories.memory import MemoryRepository
from app.seed import ADMIN, PRODUTOR_1, PRODUTOR_2, seed_memory


@pytest.fixture(autouse=True)
def _sem_supabase(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def repo() -> MemoryRepository:
    return seed_memory(MemoryRepository())


@pytest.fixture
def client(repo):
    app.dependency_overrides[get_repo] = lambda: repo
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def auth(user_id: str) -> dict:
    return {"Authorization": f"Bearer dev:{user_id}"}


@pytest.fixture
def produtor1():
    return auth(PRODUTOR_1)


@pytest.fixture
def produtor2():
    return auth(PRODUTOR_2)


@pytest.fixture
def admin():
    return auth(ADMIN)
