"""Casos de teste da API. O prefixo CTxx liga cada teste ao Plano de Testes."""

from decimal import Decimal
from urllib.parse import unquote

from app.seed import PRODUTOR_1, PRODUTOR_2

NOVO_PRODUTO = {"nome": "Banana prata", "categoria": "Frutas", "preco": "6.50", "unidade": "kg"}


def _produto(repo, nome):
    return next(p for p in repo.products.values() if p["nome"] == nome)


# ------------------------------------------------------------- acesso
def test_ct01_rota_do_produtor_exige_login(client):
    r = client.get("/me")
    assert r.status_code == 401


def test_ct02_produtor_logado_ve_proprio_perfil(client, produtor1):
    r = client.get("/me", headers=produtor1)
    assert r.status_code == 200
    assert r.json()["nome_banca"] == "Sítio Boa Esperança"


def test_ct03_whatsapp_e_normalizado(client, produtor1):
    r = client.put("/me", json={"whatsapp": "(86) 98888-7777"}, headers=produtor1)
    assert r.status_code == 200
    assert r.json()["whatsapp"] == "5586988887777"


def test_ct04_whatsapp_invalido_e_recusado(client, produtor1):
    r = client.put("/me", json={"whatsapp": "1234"}, headers=produtor1)
    assert r.status_code == 422


# ----------------------------------------------------------- produtos
def test_ct05_cadastrar_produto_aparece_na_vitrine(client, produtor1):
    r = client.post("/me/products", json=NOVO_PRODUTO, headers=produtor1)
    assert r.status_code == 201
    nomes = [p["nome"] for p in client.get("/products").json()]
    assert "Banana prata" in nomes


def test_ct06_preco_zero_ou_negativo_e_recusado(client, produtor1):
    for preco in ("0", "-3", "2.555"):
        r = client.post("/me/products", json={**NOVO_PRODUTO, "preco": preco}, headers=produtor1)
        assert r.status_code == 422, preco


def test_ct07_categoria_invalida_e_recusada(client, produtor1):
    r = client.post("/me/products", json={**NOVO_PRODUTO, "categoria": "Eletrônicos"}, headers=produtor1)
    assert r.status_code == 422


def test_ct08_produtor_nao_edita_produto_de_outro(client, repo, produtor2):
    alface = _produto(repo, "Alface crespa")
    r = client.patch(f"/me/products/{alface['id']}", json={"preco": "1.00"}, headers=produtor2)
    assert r.status_code == 403


def test_ct09_produto_esgotado_some_da_vitrine(client, repo, produtor1):
    alface = _produto(repo, "Alface crespa")
    r = client.patch(f"/me/products/{alface['id']}", json={"disponivel": False}, headers=produtor1)
    assert r.status_code == 200
    nomes = [p["nome"] for p in client.get("/products").json()]
    assert "Alface crespa" not in nomes
    # continua na lista do próprio produtor
    meus = [p["nome"] for p in client.get("/me/products", headers=produtor1).json()]
    assert "Alface crespa" in meus


def test_ct10_excluir_produto(client, repo, produtor1):
    tomate = _produto(repo, "Tomate")
    assert client.delete(f"/me/products/{tomate['id']}", headers=produtor1).status_code == 204
    assert tomate["id"] not in repo.products


# ------------------------------------------------------- vitrine/busca
def test_ct11_busca_por_nome_sem_diferenciar_maiusculas(client):
    nomes = [p["nome"] for p in client.get("/products", params={"q": "TOMA"}).json()]
    assert nomes == ["Tomate"]


def test_ct12_filtro_por_categoria(client):
    produtos = client.get("/products", params={"categoria": "Doces e Conservas"}).json()
    assert {p["nome"] for p in produtos} == {"Mel de abelha", "Doce de buriti"}


def test_ct13_filtro_por_feira(client):
    joquei = next(f for f in client.get("/fairs").json() if "Jóquei" in f["nome"])
    produtos = client.get("/products", params={"feira_id": joquei["id"]}).json()
    assert produtos and all(p["produtor_id"] == PRODUTOR_1 for p in produtos)


def test_ct14_produtor_sem_whatsapp_nao_aparece(client, repo):
    repo.profiles[PRODUTOR_2]["whatsapp"] = None
    produtores = {p["produtor_id"] for p in client.get("/products").json()}
    assert PRODUTOR_2 not in produtores


# --------------------------------------------------------------- feiras
def test_ct15_produtor_vincula_feiras(client, repo, produtor2):
    ids = [f["id"] for f in client.get("/fairs").json()]
    r = client.put("/me/fairs", json={"feira_ids": ids}, headers=produtor2)
    assert r.status_code == 200
    assert set(repo.fair_ids_for_producer(PRODUTOR_2)) == set(ids)


def test_ct16_pagina_da_feira_lista_produtores(client):
    centro = next(f for f in client.get("/fairs").json() if "Centro" in f["nome"])
    detalhe = client.get(f"/fairs/{centro['id']}").json()
    assert {p["id"] for p in detalhe["produtores"]} == {PRODUTOR_1, PRODUTOR_2}


# -------------------------------------------------------------- pedidos
def test_ct17_pedido_calcula_total_e_gera_link_whatsapp(client, repo):
    alface, tomate = _produto(repo, "Alface crespa"), _produto(repo, "Tomate")
    r = client.post(
        "/orders",
        json={
            "produtor_id": PRODUTOR_1,
            "cliente_nome": "Ana",
            "entrega": "retirada",
            "itens": [
                {"product_id": alface["id"], "quantidade": 2},
                {"product_id": tomate["id"], "quantidade": 1.5},
            ],
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert Decimal(body["total"]) == Decimal("15.50")  # 2 x 2,50 + 1,5 x 7,00
    assert body["whatsapp_url"].startswith("https://wa.me/5586999990001?text=")
    texto = unquote(body["whatsapp_url"].split("text=")[1])
    assert "Total: R$ 15,50" in texto and "Retirada na feira" in texto and "1,5 kg de Tomate" in texto
    # RF16: o produtor vê o pedido no painel
    assert len(repo.list_orders(PRODUTOR_1)) == 1


def test_ct18_preco_vem_do_banco_e_nao_do_cliente(client, repo):
    mel = _produto(repo, "Mel de abelha")
    r = client.post(
        "/orders",
        json={
            "produtor_id": PRODUTOR_2,
            "cliente_nome": "Ana",
            "entrega": "entrega",
            "itens": [{"product_id": mel["id"], "quantidade": 1, "preco": "0.01"}],
        },
    )
    assert Decimal(r.json()["total"]) == Decimal("25.00")


def test_ct19_pedido_com_produtos_de_dois_produtores_e_recusado(client, repo):
    alface, ovos = _produto(repo, "Alface crespa"), _produto(repo, "Ovos caipira")
    r = client.post(
        "/orders",
        json={
            "produtor_id": PRODUTOR_1,
            "cliente_nome": "Ana",
            "entrega": "retirada",
            "itens": [{"product_id": alface["id"], "quantidade": 1}, {"product_id": ovos["id"], "quantidade": 1}],
        },
    )
    assert r.status_code == 422


def test_ct20_pedido_de_produto_esgotado_e_recusado(client, repo):
    alface = _produto(repo, "Alface crespa")
    repo.products[alface["id"]]["disponivel"] = False
    r = client.post(
        "/orders",
        json={
            "produtor_id": PRODUTOR_1,
            "cliente_nome": "Ana",
            "entrega": "retirada",
            "itens": [{"product_id": alface["id"], "quantidade": 1}],
        },
    )
    assert r.status_code == 422
    assert "esgotado" in r.json()["detail"]


def test_ct21_pedido_vazio_e_recusado(client):
    r = client.post(
        "/orders", json={"produtor_id": PRODUTOR_1, "cliente_nome": "Ana", "entrega": "retirada", "itens": []}
    )
    assert r.status_code == 422


# ---------------------------------------------------------------- admin
def test_ct22_produtor_nao_acessa_admin(client, produtor1):
    assert client.get("/admin/fairs", headers=produtor1).status_code == 403


def test_ct23_admin_cria_feira(client, admin):
    r = client.post(
        "/admin/fairs",
        json={
            "nome": "Feira do Mocambinho",
            "endereco": "Rua A",
            "dias_semana": [0, 0, 3],
            "horario_inicio": "06:00",
            "horario_fim": "11:00",
        },
        headers=admin,
    )
    assert r.status_code == 201
    assert r.json()["dias_semana"] == [0, 3]
    assert any(f["nome"] == "Feira do Mocambinho" for f in client.get("/fairs").json())


def test_ct24_admin_desativa_produtor_e_ele_some(client, admin, produtor2):
    assert client.patch(f"/admin/producers/{PRODUTOR_2}", json={"ativo": False}, headers=admin).status_code == 200
    produtores = {p["produtor_id"] for p in client.get("/products").json()}
    assert PRODUTOR_2 not in produtores
    assert client.get("/me", headers=produtor2).status_code == 403
