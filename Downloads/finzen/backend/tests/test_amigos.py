"""Tests Bloque 5 — Sistema de amigos."""
import pytest
from sqlmodel import Session

from models.amigo import Amigo, AmigoExterno
from models.usuario import Usuario


def _headers(usuario_id: str, workspace_id: str = "x") -> dict:
    return {"X-User-Id": usuario_id, "X-Workspace-Id": workspace_id}


def test_buscar_usuario(client, datos_base):
    martin = datos_base["martin"]
    maria = datos_base["maria"]
    r = client.get("/amigos/buscar?q=mari", headers=_headers(martin.id))
    assert r.status_code == 200
    resultados = r.json()
    assert any(u["usuario_unico"] == "maria" for u in resultados)
    # No se devuelve a sí mismo
    assert all(u["id"] != martin.id for u in resultados)


def test_enviar_solicitud(client, datos_base):
    martin = datos_base["martin"]
    maria = datos_base["maria"]
    r = client.post("/amigos/solicitud", json={"receptor_usuario_unico": "@maria"}, headers=_headers(martin.id))
    assert r.status_code == 200
    data = r.json()
    assert data["estado"] == "pendiente"
    assert data["usuario_id"] == maria.id
    assert data["soy_solicitante"] is True


def test_no_duplicar_solicitud(client, datos_base):
    martin = datos_base["martin"]
    client.post("/amigos/solicitud", json={"receptor_usuario_unico": "maria"}, headers=_headers(martin.id))
    r2 = client.post("/amigos/solicitud", json={"receptor_usuario_unico": "maria"}, headers=_headers(martin.id))
    assert r2.status_code == 400


def test_solicitud_a_si_mismo_falla(client, datos_base):
    martin = datos_base["martin"]
    r = client.post("/amigos/solicitud", json={"receptor_usuario_unico": "martin"}, headers=_headers(martin.id))
    assert r.status_code == 400


def test_aceptar_solicitud(client, datos_base):
    martin = datos_base["martin"]
    maria = datos_base["maria"]

    r1 = client.post("/amigos/solicitud", json={"receptor_usuario_unico": "maria"}, headers=_headers(martin.id))
    amigo_id = r1.json()["id"]

    r2 = client.post(f"/amigos/{amigo_id}/aceptar", headers=_headers(maria.id))
    assert r2.status_code == 200
    assert r2.json()["estado"] == "aceptado"


def test_rechazar_solicitud(client, datos_base):
    martin = datos_base["martin"]
    maria = datos_base["maria"]

    r1 = client.post("/amigos/solicitud", json={"receptor_usuario_unico": "maria"}, headers=_headers(martin.id))
    amigo_id = r1.json()["id"]

    r2 = client.post(f"/amigos/{amigo_id}/rechazar", headers=_headers(maria.id))
    assert r2.status_code == 200

    # No puede aceptar después de rechazar
    r3 = client.post(f"/amigos/{amigo_id}/aceptar", headers=_headers(maria.id))
    assert r3.status_code == 400


def test_listar_amigos_solo_aceptados(client, datos_base):
    martin = datos_base["martin"]
    maria = datos_base["maria"]
    pedro = datos_base["pedro"]

    # Martin → Maria (aceptado)
    r1 = client.post("/amigos/solicitud", json={"receptor_usuario_unico": "maria"}, headers=_headers(martin.id))
    client.post(f"/amigos/{r1.json()['id']}/aceptar", headers=_headers(maria.id))

    # Martin → Pedro (pendiente)
    client.post("/amigos/solicitud", json={"receptor_usuario_unico": "pedro"}, headers=_headers(martin.id))

    r = client.get("/amigos", headers=_headers(martin.id))
    assert r.status_code == 200
    amigos = r.json()
    assert len(amigos) == 1
    assert amigos[0]["usuario_id"] == maria.id


def test_listar_pendientes(client, datos_base):
    martin = datos_base["martin"]
    maria = datos_base["maria"]

    r1 = client.post("/amigos/solicitud", json={"receptor_usuario_unico": "maria"}, headers=_headers(martin.id))
    assert r1.status_code == 200

    r = client.get("/amigos/pendientes", headers=_headers(maria.id))
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_crear_y_listar_externo(client, datos_base):
    martin = datos_base["martin"]
    r = client.post("/amigos/externos", json={"nombre": "Juan Externo", "email": "juan@example.com"}, headers=_headers(martin.id))
    assert r.status_code == 200
    assert r.json()["nombre"] == "Juan Externo"

    r2 = client.get("/amigos/externos", headers=_headers(martin.id))
    assert len(r2.json()) == 1


def test_vincular_externo_a_usuario_real(client, datos_base, session):
    martin = datos_base["martin"]
    pedro = datos_base["pedro"]

    r = client.post("/amigos/externos", json={"nombre": "Pedro Ext"}, headers=_headers(martin.id))
    externo_id = r.json()["id"]

    r2 = client.post(f"/amigos/externos/{externo_id}/vincular/{pedro.id}", headers=_headers(martin.id))
    assert r2.status_code == 200

    from models.amigo import AmigoExterno
    externo = session.get(AmigoExterno, externo_id)
    assert externo.usuario_real_id == pedro.id
