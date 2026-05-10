from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    usuario_unico: str
    nombre: str
    email: Optional[str]
    avatar_emoji: str
    creado_en: datetime
