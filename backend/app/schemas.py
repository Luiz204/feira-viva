"""Modelos de entrada e saída da API (validação com Pydantic)."""

import re
from datetime import datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

CATEGORIAS = (
    "Frutas",
    "Verduras e Legumes",
    "Raízes",
    "Grãos",
    "Ovos e Laticínios",
    "Carnes",
    "Doces e Conservas",
    "Artesanato",
    "Outros",
)
UNIDADES = ("kg", "unidade", "dúzia", "maço", "litro", "pacote")

Categoria = Literal[
    "Frutas",
    "Verduras e Legumes",
    "Raízes",
    "Grãos",
    "Ovos e Laticínios",
    "Carnes",
    "Doces e Conservas",
    "Artesanato",
    "Outros",
]
Unidade = Literal["kg", "unidade", "dúzia", "maço", "litro", "pacote"]
Preco = Decimal  # validado em cada modelo: > 0 e no máximo 2 casas (RN02)


def normalizar_whatsapp(valor: str) -> str:
    """Aceita '(86) 99999-1234', '86999991234' ou '+55 86 99999-1234' e devolve '5586999991234'."""
    digitos = re.sub(r"\D", "", valor)
    if digitos.startswith("55") and len(digitos) in (12, 13):
        digitos = digitos[2:]
    if len(digitos) not in (10, 11):
        raise ValueError("WhatsApp deve ter DDD + número, ex.: (86) 99999-1234")
    ddd = int(digitos[:2])
    if ddd < 11 or ddd > 99:
        raise ValueError("DDD inválido")
    return "55" + digitos


# ------------------------------------------------------------------ login
class Cadastro(BaseModel):
    nome: str = Field(min_length=2, max_length=80)
    email: EmailStr
    senha: str = Field(min_length=6, max_length=72)  # bcrypt usa no máximo 72 bytes


class Login(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=1, max_length=72)


# ----------------------------------------------------------------- perfis
class ProfileUpdate(BaseModel):
    nome: str | None = Field(default=None, max_length=80)
    nome_banca: str | None = Field(default=None, max_length=80)
    cidade: str | None = Field(default=None, max_length=60)
    whatsapp: str | None = None
    descricao: str | None = Field(default=None, max_length=500)
    foto_url: str | None = None

    @field_validator("whatsapp")
    @classmethod
    def _whatsapp(cls, v: str | None) -> str | None:
        return normalizar_whatsapp(v) if v else v


class ProducerPublic(BaseModel):
    id: str
    nome: str
    nome_banca: str
    cidade: str
    whatsapp: str | None = None
    descricao: str | None = None
    foto_url: str | None = None


class Me(ProducerPublic):
    role: Literal["produtor", "admin"]
    ativo: bool


# ---------------------------------------------------------------- produtos
class ProductIn(BaseModel):
    nome: str = Field(min_length=1, max_length=80)
    categoria: Categoria
    preco: Preco = Field(gt=0, max_digits=10, decimal_places=2)
    unidade: Unidade
    descricao: str | None = Field(default=None, max_length=500)
    foto_url: str | None = None
    disponivel: bool = True

    @field_validator("nome")
    @classmethod
    def _nome(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Nome é obrigatório")
        return v


class ProductUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=80)
    categoria: Categoria | None = None
    preco: Preco | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    unidade: Unidade | None = None
    descricao: str | None = Field(default=None, max_length=500)
    foto_url: str | None = None
    disponivel: bool | None = None


class ProducerSummary(BaseModel):
    id: str
    nome_banca: str
    cidade: str


class Product(BaseModel):
    id: str
    produtor_id: str
    nome: str
    categoria: str
    preco: Decimal
    unidade: str
    descricao: str | None = None
    foto_url: str | None = None
    disponivel: bool
    ativo: bool
    criado_em: datetime
    produtor: ProducerSummary | None = None


# ------------------------------------------------------------------ feiras
class FairIn(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    endereco: str = Field(min_length=2, max_length=200)
    bairro: str = ""
    cidade: str = "Teresina"
    dias_semana: list[int] = Field(default_factory=list)
    horario_inicio: time
    horario_fim: time
    ativo: bool = True

    @field_validator("dias_semana")
    @classmethod
    def _dias(cls, v: list[int]) -> list[int]:
        if any(d < 0 or d > 6 for d in v):
            raise ValueError("Dias da semana vão de 0 (domingo) a 6 (sábado)")
        return sorted(set(v))


class FairUpdate(BaseModel):
    nome: str | None = None
    endereco: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    dias_semana: list[int] | None = None
    horario_inicio: time | None = None
    horario_fim: time | None = None
    ativo: bool | None = None


class Fair(FairIn):
    id: str


class FairDetail(Fair):
    produtores: list[ProducerPublic] = []
    produtos: list[Product] = []


class ProducerDetail(ProducerPublic):
    produtos: list[Product] = []
    feiras: list[Fair] = []


class MyFairs(BaseModel):
    feira_ids: list[str]


# ----------------------------------------------------------------- pedidos
class OrderItemIn(BaseModel):
    product_id: str
    quantidade: Decimal = Field(gt=0, le=1000, decimal_places=3)


class OrderIn(BaseModel):
    produtor_id: str
    cliente_nome: str = Field(min_length=2, max_length=80)
    cliente_telefone: str | None = Field(default=None, max_length=20)
    entrega: Literal["retirada", "entrega"]
    observacao: str | None = Field(default=None, max_length=300)
    itens: list[OrderItemIn] = Field(min_length=1, max_length=50)


class OrderItem(BaseModel):
    product_id: str
    nome: str
    unidade: str
    preco: Decimal
    quantidade: Decimal
    subtotal: Decimal


class Order(BaseModel):
    id: str
    produtor_id: str
    cliente_nome: str
    cliente_telefone: str | None = None
    entrega: str
    observacao: str | None = None
    itens: list[OrderItem]
    total: Decimal
    status: str
    criado_em: datetime


class OrderCreated(Order):
    mensagem: str
    whatsapp_url: str


class AdminToggle(BaseModel):
    ativo: bool


class Sessao(BaseModel):
    token: str
    user: Me


class FotoEnviada(BaseModel):
    url: str
