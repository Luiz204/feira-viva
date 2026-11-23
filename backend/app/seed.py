"""Dados de demonstração para o modo sem Supabase."""

from datetime import time

from .repositories.memory import MemoryRepository

PRODUTOR_1 = "11111111-1111-1111-1111-111111111111"
PRODUTOR_2 = "22222222-2222-2222-2222-222222222222"
ADMIN = "99999999-9999-9999-9999-999999999999"


def seed_memory(repo: MemoryRepository) -> MemoryRepository:
    repo.add_profile(
        id=PRODUTOR_1,
        nome="José Ribeiro",
        nome_banca="Sítio Boa Esperança",
        cidade="Teresina",
        whatsapp="5586999990001",
        descricao="Hortaliças sem agrotóxico colhidas no dia.",
    )
    repo.add_profile(
        id=PRODUTOR_2,
        nome="Maria Sousa",
        nome_banca="Banca da Dona Maria",
        cidade="Teresina",
        whatsapp="5586999990002",
        descricao="Ovos caipira, mel e doces caseiros.",
    )
    repo.add_profile(id=ADMIN, nome="Administrador", role="admin")

    centro = repo.create_fair(
        {
            "nome": "Feira da Agricultura Familiar — Centro",
            "endereco": "Praça Pedro II",
            "bairro": "Centro",
            "cidade": "Teresina",
            "dias_semana": [6],
            "horario_inicio": time(6),
            "horario_fim": time(12),
        }
    )
    joquei = repo.create_fair(
        {
            "nome": "Feira Orgânica do Jóquei",
            "endereco": "Av. Nossa Senhora de Fátima",
            "bairro": "Jóquei",
            "cidade": "Teresina",
            "dias_semana": [3, 6],
            "horario_inicio": time(5, 30),
            "horario_fim": time(11),
        }
    )
    repo.set_producer_fairs(PRODUTOR_1, [centro["id"], joquei["id"]])
    repo.set_producer_fairs(PRODUTOR_2, [centro["id"]])

    for nome, cat, preco, un in [
        ("Alface crespa", "Verduras e Legumes", "2.50", "maço"),
        ("Tomate", "Verduras e Legumes", "7.00", "kg"),
        ("Cheiro-verde", "Verduras e Legumes", "2.00", "maço"),
        ("Macaxeira", "Raízes", "5.00", "kg"),
        ("Acerola", "Frutas", "8.00", "kg"),
    ]:
        repo.create_product({"produtor_id": PRODUTOR_1, "nome": nome, "categoria": cat, "preco": preco, "unidade": un})
    for nome, cat, preco, un in [
        ("Ovos caipira", "Ovos e Laticínios", "12.00", "dúzia"),
        ("Mel de abelha", "Doces e Conservas", "25.00", "litro"),
        ("Doce de buriti", "Doces e Conservas", "10.00", "pacote"),
    ]:
        repo.create_product({"produtor_id": PRODUTOR_2, "nome": nome, "categoria": cat, "preco": preco, "unidade": un})
    return repo
