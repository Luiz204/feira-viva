from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .routers import admin, auth, images, me, public
from .services.errors import DomainError

app = FastAPI(
    title="Feira Viva API",
    description="Marketplace da Agricultura Familiar e Feiras Livres",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DomainError)
async def domain_error_handler(_: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "banco": "memória (demonstração)" if get_settings().demo else "postgresql"}


app.include_router(auth.router)
app.include_router(public.router)
app.include_router(images.router)
app.include_router(me.router)
app.include_router(admin.router)
