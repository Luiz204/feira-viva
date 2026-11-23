"""Repositório PostgreSQL (Neon em produção) usando psycopg 3."""

import json
import uuid
from datetime import date, datetime, time
from decimal import Decimal
from importlib import resources
from typing import Any

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from .base import Row

# colunas que podem ser alteradas por update_* (evita SQL com nomes vindos de fora)
COLUNAS = {
    "profiles": {"nome", "nome_banca", "cidade", "whatsapp", "descricao", "foto_url", "ativo"},
    "products": {"nome", "categoria", "preco", "unidade", "descricao", "foto_url", "disponivel", "ativo"},
    "fairs": {"nome", "endereco", "bairro", "cidade", "dias_semana", "horario_inicio", "horario_fim", "ativo"},
}


def _limpo(valor: Any) -> Any:
    if isinstance(valor, uuid.UUID):
        return str(valor)
    if isinstance(valor, list):
        return [_limpo(v) for v in valor]
    return valor


def _uuid(valor: str) -> bool:
    """Ids malformados viram "não encontrado" em vez de erro 500 do Postgres."""
    try:
        uuid.UUID(str(valor))
        return True
    except ValueError:
        return False


def _uuids(valores: list[str]) -> list[str]:
    return [v for v in valores if _uuid(v)]


def _row(row: Row | None) -> Row | None:
    return {k: _limpo(v) for k, v in row.items()} if row else None


def _json(valor: Any) -> Any:
    def padrao(o: Any) -> Any:
        if isinstance(o, Decimal | date | datetime | time | uuid.UUID):
            return str(o)
        raise TypeError(type(o))

    return json.loads(json.dumps(valor, default=padrao))


class PostgresRepository:
    def __init__(self, database_url: str) -> None:
        # Neon suspende o banco ocioso: conexões curtas e checagem antes de usar
        self.pool = ConnectionPool(
            database_url,
            min_size=0,
            max_size=4,
            kwargs={"row_factory": dict_row, "autocommit": True, "prepare_threshold": None},
            check=ConnectionPool.check_connection,
            open=True,
        )

    # ---------------------------------------------------------- utilitários
    def migrate(self) -> None:
        sql = resources.files("app.db").joinpath("schema.sql").read_text(encoding="utf-8")
        with self.pool.connection() as conn, conn.transaction():
            conn.execute("select pg_advisory_xact_lock(4242)")  # duas instâncias subindo juntas
            conn.execute(sql)

    def _one(self, sql: str, params: Any = None) -> Row | None:
        with self.pool.connection() as conn:
            return _row(conn.execute(sql, params).fetchone())

    def _all(self, sql: str, params: Any = None) -> list[Row]:
        with self.pool.connection() as conn:
            return [_row(r) for r in conn.execute(sql, params).fetchall()]

    def _update(self, tabela: str, row_id: str, data: Row) -> Row:
        campos = [k for k in data if k in COLUNAS[tabela]]
        if not campos:
            return self._one(f"select * from {tabela} where id = %s", (row_id,))  # noqa: S608
        sets = ", ".join(f"{c} = %({c})s" for c in campos)
        params = {c: data[c] for c in campos} | {"_id": row_id}
        return self._one(f"update {tabela} set {sets} where id = %(_id)s returning *", params)  # noqa: S608

    # ------------------------------------------------------------- usuários
    def create_user(self, *, email: str, senha_hash: str, nome: str, role: str) -> Row:
        with self.pool.connection() as conn, conn.transaction():
            user = conn.execute(
                "insert into users (email, senha_hash) values (%s, %s) returning id", (email, senha_hash)
            ).fetchone()
            perfil = conn.execute(
                "insert into profiles (id, nome, role) values (%s, %s, %s) returning *", (user["id"], nome, role)
            ).fetchone()
        return _row(perfil)

    def get_user_by_email(self, email: str) -> Row | None:
        return self._one("select * from users where email = %s", (email,))

    # --------------------------------------------------------------- perfis
    def get_profile(self, profile_id: str) -> Row | None:
        if not _uuid(profile_id):
            return None
        return self._one("select * from profiles where id = %s", (profile_id,))

    def list_profiles(self, ids: list[str] | None = None, only_active: bool = True) -> list[Row]:
        if ids is not None:
            ids = _uuids(ids)
            if not ids:
                return []
        sql = "select * from profiles where true"
        params: list[Any] = []
        if ids is not None:
            sql += " and id = any(%s::uuid[])"
            params.append(ids)
        if only_active:
            sql += " and ativo"
        return self._all(sql + " order by nome_banca", params)

    def update_profile(self, profile_id: str, data: Row) -> Row:
        return self._update("profiles", profile_id, data)

    # ------------------------------------------------------------- produtos
    def list_products(
        self,
        *,
        produtor_ids: list[str] | None = None,
        categoria: str | None = None,
        q: str | None = None,
        only_active: bool = True,
        only_available: bool = False,
    ) -> list[Row]:
        if produtor_ids is not None and not produtor_ids:
            return []
        sql = "select * from products where true"
        params: list[Any] = []
        if produtor_ids is not None:
            sql += " and produtor_id = any(%s::uuid[])"
            params.append(produtor_ids)
        if categoria:
            sql += " and categoria = %s"
            params.append(categoria)
        if q:
            sql += " and nome ilike %s"
            params.append(f"%{q.replace('%', '').replace('_', '')}%")
        if only_active:
            sql += " and ativo"
        if only_available:
            sql += " and disponivel"
        return self._all(sql + " order by criado_em desc", params)

    def get_product(self, product_id: str) -> Row | None:
        if not _uuid(product_id):
            return None
        return self._one("select * from products where id = %s", (product_id,))

    def get_products(self, ids: list[str]) -> list[Row]:
        ids = _uuids(ids)
        if not ids:
            return []
        return self._all("select * from products where id = any(%s::uuid[])", (ids,))

    def create_product(self, data: Row) -> Row:
        cols = [c for c in data if c in COLUNAS["products"] | {"produtor_id"}]
        sql = f"insert into products ({', '.join(cols)}) values ({', '.join(f'%({c})s' for c in cols)}) returning *"
        return self._one(sql, {c: data[c] for c in cols})

    def update_product(self, product_id: str, data: Row) -> Row:
        return self._update("products", product_id, data)

    def delete_product(self, product_id: str) -> None:
        with self.pool.connection() as conn:
            conn.execute("delete from products where id = %s", (product_id,))

    # --------------------------------------------------------------- feiras
    def list_fairs(self, only_active: bool = True) -> list[Row]:
        sql = "select * from fairs" + (" where ativo" if only_active else "") + " order by nome"
        return self._all(sql)

    def get_fair(self, fair_id: str) -> Row | None:
        if not _uuid(fair_id):
            return None
        return self._one("select * from fairs where id = %s", (fair_id,))

    def create_fair(self, data: Row) -> Row:
        cols = [c for c in data if c in COLUNAS["fairs"]]
        sql = f"insert into fairs ({', '.join(cols)}) values ({', '.join(f'%({c})s' for c in cols)}) returning *"
        return self._one(sql, {c: data[c] for c in cols})

    def update_fair(self, fair_id: str, data: Row) -> Row:
        return self._update("fairs", fair_id, data)

    def producer_ids_for_fair(self, fair_id: str) -> list[str]:
        if not _uuid(fair_id):
            return []
        rows = self._all("select produtor_id from fair_producers where feira_id = %s", (fair_id,))
        return [r["produtor_id"] for r in rows]

    def fair_ids_for_producer(self, producer_id: str) -> list[str]:
        rows = self._all("select feira_id from fair_producers where produtor_id = %s", (producer_id,))
        return [r["feira_id"] for r in rows]

    def set_producer_fairs(self, producer_id: str, fair_ids: list[str]) -> None:
        with self.pool.connection() as conn, conn.transaction():
            conn.execute("delete from fair_producers where produtor_id = %s", (producer_id,))
            for feira_id in fair_ids:
                conn.execute(
                    "insert into fair_producers (feira_id, produtor_id) values (%s, %s)", (feira_id, producer_id)
                )

    # -------------------------------------------------------------- pedidos
    def create_order(self, data: Row) -> Row:
        params = {**data, "itens": Jsonb(_json(data["itens"]))}
        return self._one(
            """insert into orders (produtor_id, cliente_nome, cliente_telefone, entrega, observacao, itens, total)
               values (%(produtor_id)s, %(cliente_nome)s, %(cliente_telefone)s, %(entrega)s, %(observacao)s,
                       %(itens)s, %(total)s)
               returning *""",
            params,
        )

    def list_orders(self, produtor_id: str) -> list[Row]:
        return self._all(
            "select * from orders where produtor_id = %s order by criado_em desc limit 100", (produtor_id,)
        )

    # ---------------------------------------------------------------- fotos
    def save_image(self, owner_id: str, content_type: str, dados: bytes) -> str:
        row = self._one(
            "insert into images (owner_id, content_type, dados) values (%s, %s, %s) returning id",
            (owner_id, content_type, dados),
        )
        return row["id"]

    def get_image(self, image_id: str) -> Row | None:
        if not _uuid(image_id):
            return None
        return self._one("select content_type, dados from images where id = %s", (image_id,))
