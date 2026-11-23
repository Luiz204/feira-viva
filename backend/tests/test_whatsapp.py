from decimal import Decimal

import pytest

from app.schemas import normalizar_whatsapp
from app.services.orders import formatar_brl, formatar_quantidade, link_whatsapp


@pytest.mark.parametrize(
    "entrada, esperado",
    [
        ("(86) 99999-1234", "5586999991234"),
        ("86 3222-1234", "558632221234"),
        ("+55 86 99999-1234", "5586999991234"),
    ],
)
def test_ct25_normaliza_numeros_validos(entrada, esperado):
    assert normalizar_whatsapp(entrada) == esperado


@pytest.mark.parametrize("entrada", ["999", "(00) 99999-1234", "abc"])
def test_ct26_recusa_numeros_invalidos(entrada):
    with pytest.raises(ValueError):
        normalizar_whatsapp(entrada)


def test_ct27_formata_moeda_brasileira():
    assert formatar_brl(Decimal("1234.5")) == "R$ 1.234,50"
    assert formatar_brl(Decimal("2.5")) == "R$ 2,50"


def test_ct28_formata_quantidade():
    assert formatar_quantidade(Decimal("2.000")) == "2"
    assert formatar_quantidade(Decimal("1.5")) == "1,5"


def test_ct29_link_codifica_texto():
    url = link_whatsapp("5586999990001", "Olá! Total: R$ 5,00\nCliente: Ana")
    assert url.startswith("https://wa.me/5586999990001?text=")
    assert " " not in url and "\n" not in url
