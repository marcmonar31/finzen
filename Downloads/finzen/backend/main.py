from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler

from database import create_db_and_tables
from routers import usuarios, workspaces, cuentas, categorias, etiquetas, movimientos, transferencias, presupuestos, recurrentes

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    from jobs.tipos_cambio_job import actualizar_tipos_cambio
    from jobs.recurrentes_job import ejecutar_recurrentes
    scheduler.add_job(actualizar_tipos_cambio, "cron", hour=6, minute=0, id="tipos_cambio")
    scheduler.add_job(ejecutar_recurrentes, "interval", hours=1, id="recurrentes")
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="Finzen API",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(usuarios.router)
app.include_router(workspaces.router)
app.include_router(cuentas.router)
app.include_router(categorias.router)
app.include_router(etiquetas.router)
app.include_router(movimientos.router)
app.include_router(transferencias.router)
app.include_router(presupuestos.router)
app.include_router(recurrentes.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.2.0"}
