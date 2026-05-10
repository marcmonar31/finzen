"""
Tests de autenticación simulada.
- Sin header → 422 (campo requerido faltante)
- Header inválido → 401
- Header válido → 200
- Usuario sin acceso al workspace → 403
"""
from fastapi.testclient import TestClient
from sqlmodel import Session


def test_get_me_sin_header(client: TestClient):
    resp = client.get("/usuarios/me")
    assert resp.status_code == 422


def test_get_me_usuario_invalido(client: TestClient):
    resp = client.get("/usuarios/me", headers={"X-User-Id": "no-existe"})
    assert resp.status_code == 401


def test_get_me_valido(client: TestClient, usuarios_demo: dict):
    martin = usuarios_demo["martin"]
    resp = client.get("/usuarios/me", headers={"X-User-Id": martin.id})
    assert resp.status_code == 200
    data = resp.json()
    assert data["usuario_unico"] == "martin"
    assert data["nombre"] == "Martín García"


def test_mis_workspaces(client: TestClient, usuarios_demo: dict):
    martin = usuarios_demo["martin"]
    resp = client.get("/usuarios/me/workspaces", headers={"X-User-Id": martin.id})
    assert resp.status_code == 200
    workspaces = resp.json()
    assert len(workspaces) == 2
    nombres = {ws["nombre"] for ws in workspaces}
    assert "Personal Martín" in nombres
    assert "Familia García" in nombres


def test_workspace_acceso_valido(client: TestClient, usuarios_demo: dict):
    martin = usuarios_demo["martin"]
    ws = usuarios_demo["ws_martin"]
    resp = client.get(
        f"/workspaces/{ws.id}",
        headers={"X-User-Id": martin.id, "X-Workspace-Id": ws.id},
    )
    assert resp.status_code == 200
    assert resp.json()["nombre"] == "Personal Martín"


def test_workspace_sin_acceso(client: TestClient, usuarios_demo: dict):
    pedro = usuarios_demo["pedro"]
    ws_martin = usuarios_demo["ws_martin"]
    resp = client.get(
        f"/workspaces/{ws_martin.id}",
        headers={"X-User-Id": pedro.id, "X-Workspace-Id": ws_martin.id},
    )
    assert resp.status_code == 403


def test_workspace_no_existe(client: TestClient, usuarios_demo: dict):
    martin = usuarios_demo["martin"]
    resp = client.get(
        "/workspaces/uuid-falso",
        headers={"X-User-Id": martin.id, "X-Workspace-Id": "uuid-falso"},
    )
    assert resp.status_code == 404


def test_usuarios_demo_endpoint(client: TestClient, usuarios_demo: dict):
    resp = client.get("/usuarios/demo")
    assert resp.status_code == 200
    usuarios = resp.json()
    assert len(usuarios) == 3
    nombres = {u["usuario_unico"] for u in usuarios}
    assert {"martin", "maria", "pedro"} == nombres


def test_maria_accede_workspace_familia(client: TestClient, usuarios_demo: dict):
    maria = usuarios_demo["maria"]
    ws_familia = usuarios_demo["ws_familia"]
    resp = client.get(
        f"/workspaces/{ws_familia.id}",
        headers={"X-User-Id": maria.id, "X-Workspace-Id": ws_familia.id},
    )
    assert resp.status_code == 200
