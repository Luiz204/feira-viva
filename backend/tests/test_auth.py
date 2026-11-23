"""Login, cadastro e fotos."""

from app.seed import PRODUTOR_1

PNG_1PX = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
    "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082"
)


def test_ct39_cadastro_cria_conta_e_devolve_token(client):
    r = client.post("/auth/cadastro", json={"nome": "Rita", "email": "Rita@Exemplo.com", "senha": "segredo1"})
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["role"] == "produtor" and body["user"]["nome"] == "Rita"
    me = client.get("/me", headers={"Authorization": f"Bearer {body['token']}"})
    assert me.status_code == 200


def test_ct40_email_repetido_e_recusado(client):
    dados = {"nome": "Rita", "email": "rita@exemplo.com", "senha": "segredo1"}
    client.post("/auth/cadastro", json=dados)
    r = client.post("/auth/cadastro", json={**dados, "email": "RITA@exemplo.com"})
    assert r.status_code == 422


def test_ct41_senha_curta_e_email_invalido(client):
    assert (
        client.post("/auth/cadastro", json={"nome": "Rita", "email": "rita@x.com", "senha": "123"}).status_code == 422
    )
    assert client.post("/auth/cadastro", json={"nome": "Rita", "email": "rita", "senha": "123456"}).status_code == 422


def test_ct42_login_com_senha_certa_e_errada(client):
    ok = client.post("/auth/entrar", json={"email": "jose@demo.com", "senha": "feiraviva"})
    assert ok.status_code == 200 and ok.json()["user"]["id"] == PRODUTOR_1
    errado = client.post("/auth/entrar", json={"email": "jose@demo.com", "senha": "outra"})
    inexistente = client.post("/auth/entrar", json={"email": "ninguem@demo.com", "senha": "feiraviva"})
    assert errado.status_code == inexistente.status_code == 401
    assert errado.json()["detail"] == inexistente.json()["detail"]  # não revela se o e-mail existe


def test_ct43_token_adulterado_e_recusado(client):
    r = client.get("/me", headers={"Authorization": "Bearer abc.def.ghi"})
    assert r.status_code == 401


def test_ct44_email_da_lista_de_admins_vira_admin(client):
    r = client.post("/auth/cadastro", json={"nome": "Chefe", "email": "chefe@feiraviva.com", "senha": "segredo1"})
    assert r.json()["user"]["role"] == "admin"


def test_ct45_upload_e_leitura_de_foto(client, produtor1):
    r = client.post("/me/fotos", files={"arquivo": ("p.png", PNG_1PX, "image/png")}, headers=produtor1)
    assert r.status_code == 201
    foto = client.get(r.json()["url"])
    assert foto.status_code == 200
    assert foto.headers["content-type"] == "image/png" and foto.content == PNG_1PX


def test_ct46_upload_recusa_tipo_errado_e_exige_login(client, produtor1):
    r = client.post("/me/fotos", files={"arquivo": ("a.pdf", b"%PDF", "application/pdf")}, headers=produtor1)
    assert r.status_code == 422
    assert client.post("/me/fotos", files={"arquivo": ("p.png", PNG_1PX, "image/png")}).status_code == 401
