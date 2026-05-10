from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models.categoria import Categoria
from models.movimiento import Movimiento
from models.workspace import Workspace
from deps import get_current_workspace
from schemas.categoria import CategoriaCreate, CategoriaUpdate, CategoriaOut

router = APIRouter(prefix="/categorias", tags=["categorias"])


def _build_tree(categorias: list[Categoria]) -> List[CategoriaOut]:
    """Construye árbol 2 niveles padre → hijos."""
    por_id = {c.id: CategoriaOut.model_validate(c) for c in categorias}
    raices: List[CategoriaOut] = []
    for c in por_id.values():
        if c.parent_id and c.parent_id in por_id:
            por_id[c.parent_id].hijos.append(c)
        else:
            raices.append(c)
    return sorted(raices, key=lambda x: x.orden)


@router.get("", response_model=List[CategoriaOut])
def listar_categorias(
    tipo: Optional[str] = None,
    flat: bool = False,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    q = select(Categoria).where(
        Categoria.workspace_id == workspace.id,
        Categoria.archivado_en.is_(None),  # type: ignore[union-attr]
    )
    if tipo:
        q = q.where(Categoria.tipo == tipo)
    categorias = session.exec(q.order_by(Categoria.orden)).all()

    if flat:
        return [CategoriaOut.model_validate(c) for c in categorias]
    return _build_tree(list(categorias))


@router.post("", response_model=CategoriaOut, status_code=201)
def crear_categoria(
    body: CategoriaCreate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    if body.tipo not in ("ingreso", "gasto", "transferencia"):
        raise HTTPException(400, "tipo debe ser ingreso, gasto o transferencia")
    if body.parent_id:
        padre = session.get(Categoria, body.parent_id)
        if not padre or padre.workspace_id != workspace.id:
            raise HTTPException(400, "Categoría padre no encontrada")

    cat = Categoria(workspace_id=workspace.id, **body.model_dump())
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return CategoriaOut.model_validate(cat)


@router.patch("/{cat_id}", response_model=CategoriaOut)
def actualizar_categoria(
    cat_id: str,
    body: CategoriaUpdate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    cat = session.get(Categoria, cat_id)
    if not cat or cat.workspace_id != workspace.id:
        raise HTTPException(404, "Categoría no encontrada")
    for campo, valor in body.model_dump(exclude_unset=True).items():
        setattr(cat, campo, valor)
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return CategoriaOut.model_validate(cat)


@router.delete("/{cat_id}", status_code=204)
def archivar_categoria(
    cat_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    cat = session.get(Categoria, cat_id)
    if not cat or cat.workspace_id != workspace.id:
        raise HTTPException(404, "Categoría no encontrada")

    movs_con_cat = session.exec(
        select(Movimiento).where(
            Movimiento.categoria_id == cat_id,
            Movimiento.archivado_en.is_(None),  # type: ignore[union-attr]
        )
    ).first()
    if movs_con_cat:
        raise HTTPException(400, "Reasigna los movimientos de esta categoría antes de archivarla")

    cat.archivado_en = datetime.utcnow()
    session.add(cat)
    session.commit()
