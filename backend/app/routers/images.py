"""Upload e entrega de fotos de produtos e perfis."""

from fastapi import APIRouter, Depends, File, Response, UploadFile

from ..deps import CurrentUser, get_current_user, get_repo
from ..repositories.base import Repository
from ..schemas import FotoEnviada
from ..services.errors import Invalid, NotFound

router = APIRouter(tags=["fotos"])

TIPOS = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 2 * 1024 * 1024  # o front redimensiona antes de enviar


@router.post("/me/fotos", response_model=FotoEnviada, status_code=201)
async def enviar_foto(
    arquivo: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
    repo: Repository = Depends(get_repo),
):
    if arquivo.content_type not in TIPOS:
        raise Invalid("Use uma foto JPG, PNG ou WebP")
    dados = await arquivo.read(MAX_BYTES + 1)
    if len(dados) > MAX_BYTES:
        raise Invalid("A foto deve ter no máximo 2 MB")
    if not dados:
        raise Invalid("Arquivo vazio")
    image_id = repo.save_image(user.id, arquivo.content_type, dados)
    return {"url": f"/images/{image_id}"}


@router.get("/images/{image_id}")
def ver_foto(image_id: str, repo: Repository = Depends(get_repo)):
    foto = repo.get_image(image_id)
    if not foto:
        raise NotFound("Foto não encontrada")
    return Response(
        content=bytes(foto["dados"]),
        media_type=foto["content_type"],
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
