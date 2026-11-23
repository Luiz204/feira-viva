"""Rotas do administrador: feiras e moderação (RF17, RF18)."""

from fastapi import APIRouter, Depends

from ..deps import CurrentUser, get_repo, require_admin
from ..repositories.base import Repository
from ..schemas import AdminToggle, Fair, FairIn, FairUpdate, Me, Product
from ..services.errors import NotFound

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/fairs", response_model=list[Fair])
def todas_feiras(_: CurrentUser = Depends(require_admin), repo: Repository = Depends(get_repo)):
    return repo.list_fairs(only_active=False)


@router.post("/fairs", response_model=Fair, status_code=201)
def criar_feira(dados: FairIn, _: CurrentUser = Depends(require_admin), repo: Repository = Depends(get_repo)):
    return repo.create_fair(dados.model_dump())


@router.patch("/fairs/{feira_id}", response_model=Fair)
def editar_feira(
    feira_id: str, dados: FairUpdate, _: CurrentUser = Depends(require_admin), repo: Repository = Depends(get_repo)
):
    if not repo.get_fair(feira_id):
        raise NotFound("Feira não encontrada")
    return repo.update_fair(feira_id, dados.model_dump(exclude_unset=True))


@router.get("/producers", response_model=list[Me])
def todos_produtores(_: CurrentUser = Depends(require_admin), repo: Repository = Depends(get_repo)):
    return [p for p in repo.list_profiles(only_active=False) if p["role"] == "produtor"]


@router.patch("/producers/{produtor_id}", response_model=Me)
def moderar_produtor(
    produtor_id: str, dados: AdminToggle, _: CurrentUser = Depends(require_admin), repo: Repository = Depends(get_repo)
):
    if not repo.get_profile(produtor_id):
        raise NotFound("Produtor não encontrado")
    return repo.update_profile(produtor_id, {"ativo": dados.ativo})


@router.patch("/products/{product_id}", response_model=Product)
def moderar_produto(
    product_id: str, dados: AdminToggle, _: CurrentUser = Depends(require_admin), repo: Repository = Depends(get_repo)
):
    if not repo.get_product(product_id):
        raise NotFound("Produto não encontrado")
    return repo.update_product(product_id, {"ativo": dados.ativo})
