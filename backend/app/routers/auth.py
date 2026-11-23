"""Cadastro e login de produtores (RF01, RF02)."""

from fastapi import APIRouter, Depends

from ..deps import get_repo
from ..repositories.base import Repository
from ..schemas import Cadastro, Login, Sessao
from ..services import auth

router = APIRouter(prefix="/auth", tags=["login"])


@router.post("/cadastro", response_model=Sessao, status_code=201)
def cadastrar(dados: Cadastro, repo: Repository = Depends(get_repo)):
    token, perfil = auth.cadastrar(repo, dados.nome, dados.email, dados.senha)
    return {"token": token, "user": perfil}


@router.post("/entrar", response_model=Sessao)
def entrar(dados: Login, repo: Repository = Depends(get_repo)):
    token, perfil = auth.entrar(repo, dados.email, dados.senha)
    return {"token": token, "user": perfil}
