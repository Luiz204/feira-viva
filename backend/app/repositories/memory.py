"""Repositório em memória: usado nos testes e para rodar a API sem Supabase."""

import uuid
from copy import deepcopy
from datetime import UTC, datetime

from .base import Row


def _now() -> str:
    return datetime.now(UTC).isoformat()


class MemoryRepository:
    def __init__(self) -> None:
        self.profiles: dict[str, Row] = {}
        self.products: dict[str, Row] = {}
        self.fairs: dict[str, Row] = {}
        self.fair_producers: set[tuple[str, str]] = set()  # (feira_id, produtor_id)
        self.orders: dict[str, Row] = {}

    # ------------------------------------------------------------ perfis
    def add_profile(self, **data) -> Row:
        row = {
            "id": data.get("id") or str(uuid.uuid4()),
            "role": "produtor",
            "nome": "",
            "nome_banca": "",
            "cidade": "",
            "whatsapp": None,
            "descricao": None,
            "foto_url": None,
            "ativo": True,
            "criado_em": _now(),
        }
        row.update(data)
        self.profiles[row["id"]] = row
        return deepcopy(row)

    def get_profile(self, profile_id: str) -> Row | None:
        row = self.profiles.get(profile_id)
        return deepcopy(row) if row else None

    def list_profiles(self, ids: list[str] | None = None, only_active: bool = True) -> list[Row]:
        rows = [
            p for p in self.profiles.values() if (ids is None or p["id"] in ids) and (not only_active or p["ativo"])
        ]
        return deepcopy(rows)

    def update_profile(self, profile_id: str, data: Row) -> Row:
        self.profiles[profile_id].update(data)
        return deepcopy(self.profiles[profile_id])

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
        rows = []
        for p in self.products.values():
            if produtor_ids is not None and p["produtor_id"] not in produtor_ids:
                continue
            if categoria and p["categoria"] != categoria:
                continue
            if q and q.lower() not in p["nome"].lower():
                continue
            if only_active and not p["ativo"]:
                continue
            if only_available and not p["disponivel"]:
                continue
            rows.append(p)
        rows.sort(key=lambda r: r["criado_em"], reverse=True)
        return deepcopy(rows)

    def get_product(self, product_id: str) -> Row | None:
        row = self.products.get(product_id)
        return deepcopy(row) if row else None

    def get_products(self, ids: list[str]) -> list[Row]:
        return [deepcopy(self.products[i]) for i in ids if i in self.products]

    def create_product(self, data: Row) -> Row:
        row = {
            "id": str(uuid.uuid4()),
            "descricao": None,
            "foto_url": None,
            "disponivel": True,
            "ativo": True,
            "criado_em": _now(),
            **data,
        }
        self.products[row["id"]] = row
        return deepcopy(row)

    def update_product(self, product_id: str, data: Row) -> Row:
        self.products[product_id].update(data)
        return deepcopy(self.products[product_id])

    def delete_product(self, product_id: str) -> None:
        self.products.pop(product_id, None)

    # ------------------------------------------------------------ feiras
    def list_fairs(self, only_active: bool = True) -> list[Row]:
        rows = [f for f in self.fairs.values() if not only_active or f["ativo"]]
        rows.sort(key=lambda r: r["nome"])
        return deepcopy(rows)

    def get_fair(self, fair_id: str) -> Row | None:
        row = self.fairs.get(fair_id)
        return deepcopy(row) if row else None

    def create_fair(self, data: Row) -> Row:
        row = {"id": str(uuid.uuid4()), "ativo": True, **data}
        self.fairs[row["id"]] = row
        return deepcopy(row)

    def update_fair(self, fair_id: str, data: Row) -> Row:
        self.fairs[fair_id].update(data)
        return deepcopy(self.fairs[fair_id])

    def producer_ids_for_fair(self, fair_id: str) -> list[str]:
        return [p for f, p in self.fair_producers if f == fair_id]

    def fair_ids_for_producer(self, producer_id: str) -> list[str]:
        return [f for f, p in self.fair_producers if p == producer_id]

    def set_producer_fairs(self, producer_id: str, fair_ids: list[str]) -> None:
        self.fair_producers = {(f, p) for f, p in self.fair_producers if p != producer_id}
        self.fair_producers |= {(f, producer_id) for f in fair_ids}

    # ----------------------------------------------------------- pedidos
    def create_order(self, data: Row) -> Row:
        row = {"id": str(uuid.uuid4()), "status": "enviado_whatsapp", "criado_em": _now(), **data}
        self.orders[row["id"]] = row
        return deepcopy(row)

    def list_orders(self, produtor_id: str) -> list[Row]:
        rows = [o for o in self.orders.values() if o["produtor_id"] == produtor_id]
        rows.sort(key=lambda r: r["criado_em"], reverse=True)
        return deepcopy(rows)
