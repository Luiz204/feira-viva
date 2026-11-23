"""Rotas públicas (sem login): vitrine, feiras, produtores e envio de pedido."""

from fastapi import APIRouter, Depends, Query

from ..deps import get_repo
from ..repositories.base import Repository
from ..schemas import CATEGORIAS, UNIDADES, Fair, FairDetail, OrderCreated, OrderIn, ProducerDetail, Product
from ..services import catalog, orders

router = APIRouter(tags=["público"])


@router.get("/meta")
def meta() -> dict:
    """Listas fixas usadas nos formulários (RN03, RN04)."""
    return {"categorias": CATEGORIAS, "unidades": UNIDADES}


@router.get("/products", response_model=list[Product])
def listar_vitrine(
    q: str | None = Query(default=None, max_length=80),
    categoria: str | None = None,
    feira_id: str | None = None,
    repo: Repository = Depends(get_repo),
):
    return catalog.vitrine(repo, q=q, categoria=categoria, feira_id=feira_id)


@router.get("/fairs", response_model=list[Fair])
def listar_feiras(repo: Repository = Depends(get_repo)):
    return repo.list_fairs(only_active=True)


@router.get("/fairs/{feira_id}", response_model=FairDetail)
def detalhe_feira(feira_id: str, repo: Repository = Depends(get_repo)):
    return catalog.detalhe_feira(repo, feira_id)


@router.get("/producers/{produtor_id}", response_model=ProducerDetail)
def detalhe_produtor(produtor_id: str, repo: Repository = Depends(get_repo)):
    return catalog.detalhe_produtor(repo, produtor_id)


@router.post("/orders", response_model=OrderCreated, status_code=201)
def enviar_pedido(dados: OrderIn, repo: Repository = Depends(get_repo)):
    return orders.criar_pedido(repo, dados)
