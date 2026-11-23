"""Repositório que fala com o Supabase (PostgreSQL) via supabase-py."""

import json

from supabase import Client, create_client

from .base import Row


def _jsonable(data: Row) -> Row:
    """Converte Decimal/time em tipos que o cliente HTTP aceita."""
    return json.loads(json.dumps(data, default=str))


class SupabaseRepository:
    def __init__(self, url: str, service_role_key: str) -> None:
        self.client: Client = create_client(url, service_role_key)

    # ------------------------------------------------------------ perfis
    def get_profile(self, profile_id: str) -> Row | None:
        res = self.client.table("profiles").select("*").eq("id", profile_id).limit(1).execute()
        return res.data[0] if res.data else None

    def list_profiles(self, ids: list[str] | None = None, only_active: bool = True) -> list[Row]:
        query = self.client.table("profiles").select("*")
        if ids is not None:
            if not ids:
                return []
            query = query.in_("id", ids)
        if only_active:
            query = query.eq("ativo", True)
        return query.execute().data

    def update_profile(self, profile_id: str, data: Row) -> Row:
        res = self.client.table("profiles").update(_jsonable(data)).eq("id", profile_id).execute()
        return res.data[0]

    # ---------------------------------------------------------- produtos
    def list_products(
        self,
        *,
        produtor_ids: list[str] | None = None,
        categoria: str | None = None,
        q: str | None = None,
        only_active: bool = True,
        only_available: bool = False,
    ) -> list[Row]:
        query = self.client.table("products").select("*")
        if produtor_ids is not None:
            if not produtor_ids:
                return []
            query = query.in_("produtor_id", produtor_ids)
        if categoria:
            query = query.eq("categoria", categoria)
        if q:
            query = query.ilike("nome", f"%{q}%")
        if only_active:
            query = query.eq("ativo", True)
        if only_available:
            query = query.eq("disponivel", True)
        return query.order("criado_em", desc=True).execute().data

    def get_product(self, product_id: str) -> Row | None:
        res = self.client.table("products").select("*").eq("id", product_id).limit(1).execute()
        return res.data[0] if res.data else None

    def get_products(self, ids: list[str]) -> list[Row]:
        if not ids:
            return []
        return self.client.table("products").select("*").in_("id", ids).execute().data

    def create_product(self, data: Row) -> Row:
        return self.client.table("products").insert(_jsonable(data)).execute().data[0]

    def update_product(self, product_id: str, data: Row) -> Row:
        res = self.client.table("products").update(_jsonable(data)).eq("id", product_id).execute()
        return res.data[0]

    def delete_product(self, product_id: str) -> None:
        self.client.table("products").delete().eq("id", product_id).execute()

    # ------------------------------------------------------------ feiras
    def list_fairs(self, only_active: bool = True) -> list[Row]:
        query = self.client.table("fairs").select("*")
        if only_active:
            query = query.eq("ativo", True)
        return query.order("nome").execute().data

    def get_fair(self, fair_id: str) -> Row | None:
        res = self.client.table("fairs").select("*").eq("id", fair_id).limit(1).execute()
        return res.data[0] if res.data else None

    def create_fair(self, data: Row) -> Row:
        return self.client.table("fairs").insert(_jsonable(data)).execute().data[0]

    def update_fair(self, fair_id: str, data: Row) -> Row:
        return self.client.table("fairs").update(_jsonable(data)).eq("id", fair_id).execute().data[0]

    def producer_ids_for_fair(self, fair_id: str) -> list[str]:
        res = self.client.table("fair_producers").select("produtor_id").eq("feira_id", fair_id).execute()
        return [r["produtor_id"] for r in res.data]

    def fair_ids_for_producer(self, producer_id: str) -> list[str]:
        res = self.client.table("fair_producers").select("feira_id").eq("produtor_id", producer_id).execute()
        return [r["feira_id"] for r in res.data]

    def set_producer_fairs(self, producer_id: str, fair_ids: list[str]) -> None:
        self.client.table("fair_producers").delete().eq("produtor_id", producer_id).execute()
        if fair_ids:
            rows = [{"feira_id": f, "produtor_id": producer_id} for f in fair_ids]
            self.client.table("fair_producers").insert(rows).execute()

    # ----------------------------------------------------------- pedidos
    def create_order(self, data: Row) -> Row:
        return self.client.table("orders").insert(_jsonable(data)).execute().data[0]

    def list_orders(self, produtor_id: str) -> list[Row]:
        res = (
            self.client.table("orders")
            .select("*")
            .eq("produtor_id", produtor_id)
            .order("criado_em", desc=True)
            .limit(100)
            .execute()
        )
        return res.data
