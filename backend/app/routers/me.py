"""Rotas do produtor logado: perfil, produtos, feiras e pedidos recebidos."""

from fastapi import APIRouter, Depends, Response

from ..deps import CurrentUser, get_current_user, get_repo
from ..repositories.base import Repository
from ..schemas import Me, MyFairs, Order, Product, ProductIn, ProductUpdate, ProfileUpdate
from ..services import catalog

router = APIRouter(prefix="/me", tags=["produtor"])


@router.get("", response_model=Me)
def meu_perfil(user: CurrentUser = Depends(get_current_user), repo: Repository = Depends(get_repo)):
    return repo.get_profile(user.id)


@router.put("", response_model=Me)
def atualizar_perfil(
    dados: ProfileUpdate, user: CurrentUser = Depends(get_current_user), repo: Repository = Depends(get_repo)
):
    return repo.update_profile(user.id, dados.model_dump(exclude_unset=True))


@router.get("/products", response_model=list[Product])
def meus_produtos(user: CurrentUser = Depends(get_current_user), repo: Repository = Depends(get_repo)):
    return repo.list_products(produtor_ids=[user.id], only_active=False)


@router.post("/products", response_model=Product, status_code=201)
def criar_produto(
    dados: ProductIn, user: CurrentUser = Depends(get_current_user), repo: Repository = Depends(get_repo)
):
    return repo.create_product({**dados.model_dump(), "produtor_id": user.id})


@router.patch("/products/{product_id}", response_model=Product)
def editar_produto(
    product_id: str,
    dados: ProductUpdate,
    user: CurrentUser = Depends(get_current_user),
    repo: Repository = Depends(get_repo),
):
    catalog.produto_do_dono(repo, product_id, user.id)
    return repo.update_product(product_id, dados.model_dump(exclude_unset=True))


@router.delete("/products/{product_id}", status_code=204)
def excluir_produto(
    product_id: str, user: CurrentUser = Depends(get_current_user), repo: Repository = Depends(get_repo)
):
    catalog.produto_do_dono(repo, product_id, user.id)
    repo.delete_product(product_id)
    return Response(status_code=204)


@router.get("/fairs", response_model=MyFairs)
def minhas_feiras(user: CurrentUser = Depends(get_current_user), repo: Repository = Depends(get_repo)):
    return {"feira_ids": repo.fair_ids_for_producer(user.id)}


@router.put("/fairs", response_model=MyFairs)
def definir_feiras(dados: MyFairs, user: CurrentUser = Depends(get_current_user), repo: Repository = Depends(get_repo)):
    return {"feira_ids": catalog.vincular_feiras(repo, user.id, dados.feira_ids)}


@router.get("/orders", response_model=list[Order])
def meus_pedidos(user: CurrentUser = Depends(get_current_user), repo: Repository = Depends(get_repo)):
    return repo.list_orders(user.id)
