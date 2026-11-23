"""Pedido via WhatsApp (RF15, RF16, RN05).

O preço de cada item é lido do banco, nunca do navegador, para que o
cliente não consiga alterar o valor do pedido."""

from decimal import ROUND_HALF_UP, Decimal
from urllib.parse import quote

from ..repositories.base import Repository, Row
from ..schemas import OrderIn
from .catalog import produtor_visivel
from .errors import Invalid, NotFound

ENTREGA_LABEL = {"retirada": "Retirada na feira", "entrega": "Combinar entrega"}
CENTAVO = Decimal("0.01")


def formatar_brl(valor: Decimal) -> str:
    """Decimal('1234.5') -> 'R$ 1.234,50'"""
    texto = f"{valor.quantize(CENTAVO, ROUND_HALF_UP):,.2f}"
    return "R$ " + texto.replace(",", "X").replace(".", ",").replace("X", ".")


def formatar_quantidade(q: Decimal) -> str:
    normalizada = q.normalize()
    texto = f"{normalizada:f}"
    return texto.replace(".", ",")


def montar_mensagem(perfil: Row, pedido: Row) -> str:
    banca = perfil.get("nome_banca") or perfil.get("nome") or "produtor"
    linhas = [f"Olá, {banca}! Quero fazer um pedido pelo Feira Viva:", ""]
    for item in pedido["itens"]:
        linhas.append(
            f"• {formatar_quantidade(Decimal(str(item['quantidade'])))} {item['unidade']} de {item['nome']}"
            f" — {formatar_brl(Decimal(str(item['subtotal'])))}"
        )
    linhas += ["", f"*Total: {formatar_brl(Decimal(str(pedido['total'])))}*", f"Cliente: {pedido['cliente_nome']}"]
    if pedido.get("cliente_telefone"):
        linhas.append(f"Telefone: {pedido['cliente_telefone']}")
    linhas.append(f"Entrega: {ENTREGA_LABEL[pedido['entrega']]}")
    if pedido.get("observacao"):
        linhas.append(f"Obs.: {pedido['observacao']}")
    return "\n".join(linhas)


def link_whatsapp(numero: str, mensagem: str) -> str:
    return f"https://wa.me/{numero}?text={quote(mensagem)}"


def criar_pedido(repo: Repository, dados: OrderIn) -> Row:
    perfil = repo.get_profile(dados.produtor_id)
    if not perfil or not produtor_visivel(perfil):
        raise NotFound("Produtor não encontrado ou sem WhatsApp cadastrado")

    produtos = {p["id"]: p for p in repo.get_products([i.product_id for i in dados.itens])}
    itens: list[Row] = []
    total = Decimal("0")
    for item in dados.itens:
        produto = produtos.get(item.product_id)
        if not produto or not produto["ativo"]:
            raise NotFound(f"Produto {item.product_id} não encontrado")
        if produto["produtor_id"] != dados.produtor_id:
            raise Invalid("Um pedido só pode ter produtos de um mesmo produtor")
        if not produto["disponivel"]:
            raise Invalid(f"{produto['nome']} está esgotado")
        preco = Decimal(str(produto["preco"]))
        subtotal = (preco * item.quantidade).quantize(CENTAVO, ROUND_HALF_UP)
        total += subtotal
        itens.append(
            {
                "product_id": produto["id"],
                "nome": produto["nome"],
                "unidade": produto["unidade"],
                "preco": preco,
                "quantidade": item.quantidade,
                "subtotal": subtotal,
            }
        )

    pedido = repo.create_order(
        {
            "produtor_id": dados.produtor_id,
            "cliente_nome": dados.cliente_nome.strip(),
            "cliente_telefone": dados.cliente_telefone,
            "entrega": dados.entrega,
            "observacao": dados.observacao,
            "itens": itens,
            "total": total,
        }
    )
    mensagem = montar_mensagem(perfil, pedido)
    return {**pedido, "mensagem": mensagem, "whatsapp_url": link_whatsapp(perfil["whatsapp"], mensagem)}
