"""Regras do catálogo: vitrine pública, produtos do produtor, feiras."""

from ..repositories.base import Repository, Row
from .errors import Forbidden, NotFound


def produtor_visivel(perfil: Row) -> bool:
    """RN01: só aparece ao público o produtor ativo com WhatsApp preenchido."""
    return bool(perfil.get("ativo")) and bool(perfil.get("whatsapp"))


def _resumo(perfil: Row) -> Row:
    return {
        "id": perfil["id"],
        "nome_banca": perfil.get("nome_banca") or perfil.get("nome") or "",
        "cidade": perfil.get("cidade") or "",
    }


def _publico(perfil: Row) -> Row:
    return {
        "id": perfil["id"],
        "nome": perfil.get("nome") or "",
        "nome_banca": perfil.get("nome_banca") or perfil.get("nome") or "",
        "cidade": perfil.get("cidade") or "",
        "whatsapp": perfil.get("whatsapp"),
        "descricao": perfil.get("descricao"),
        "foto_url": perfil.get("foto_url"),
    }


def _anexar_produtor(produtos: list[Row], perfis: dict[str, Row]) -> list[Row]:
    for p in produtos:
        perfil = perfis.get(p["produtor_id"])
        p["produtor"] = _resumo(perfil) if perfil else None
    return produtos


def produtores_visiveis(repo: Repository, ids: list[str] | None = None) -> dict[str, Row]:
    return {p["id"]: p for p in repo.list_profiles(ids, only_active=True) if produtor_visivel(p)}


def vitrine(
    repo: Repository, *, q: str | None = None, categoria: str | None = None, feira_id: str | None = None
) -> list[Row]:
    """RF11/RF12: produtos disponíveis de produtores visíveis, com busca e filtros."""
    ids = repo.producer_ids_for_fair(feira_id) if feira_id else None
    perfis = produtores_visiveis(repo, ids)
    produtos = repo.list_products(
        produtor_ids=list(perfis.keys()),
        categoria=categoria,
        q=q.strip() if q else None,
        only_active=True,
        only_available=True,
    )
    return _anexar_produtor(produtos, perfis)


def detalhe_produtor(repo: Repository, produtor_id: str) -> Row:
    perfil = repo.get_profile(produtor_id)
    if not perfil or not produtor_visivel(perfil):
        raise NotFound("Produtor não encontrado")
    produtos = repo.list_products(produtor_ids=[produtor_id], only_active=True)
    feiras_ids = set(repo.fair_ids_for_producer(produtor_id))
    feiras = [f for f in repo.list_fairs(only_active=True) if f["id"] in feiras_ids]
    return {**_publico(perfil), "produtos": _anexar_produtor(produtos, {perfil["id"]: perfil}), "feiras": feiras}


def detalhe_feira(repo: Repository, feira_id: str) -> Row:
    feira = repo.get_fair(feira_id)
    if not feira or not feira["ativo"]:
        raise NotFound("Feira não encontrada")
    perfis = produtores_visiveis(repo, repo.producer_ids_for_fair(feira_id))
    produtos = repo.list_products(produtor_ids=list(perfis.keys()), only_active=True, only_available=True)
    return {
        **feira,
        "produtores": [_publico(p) for p in perfis.values()],
        "produtos": _anexar_produtor(produtos, perfis),
    }


def produto_do_dono(repo: Repository, product_id: str, user_id: str, is_admin: bool = False) -> Row:
    """RF06: o produtor só altera os próprios produtos."""
    produto = repo.get_product(product_id)
    if not produto:
        raise NotFound("Produto não encontrado")
    if produto["produtor_id"] != user_id and not is_admin:
        raise Forbidden("Este produto pertence a outro produtor")
    return produto


def vincular_feiras(repo: Repository, produtor_id: str, feira_ids: list[str]) -> list[str]:
    """RF09: substitui as feiras do produtor; ignora ids repetidos e recusa feira inexistente."""
    ativas = {f["id"] for f in repo.list_fairs(only_active=True)}
    unicas = list(dict.fromkeys(feira_ids))
    invalidas = [f for f in unicas if f not in ativas]
    if invalidas:
        raise NotFound(f"Feira não encontrada: {', '.join(invalidas)}")
    repo.set_producer_fairs(produtor_id, unicas)
    return unicas
