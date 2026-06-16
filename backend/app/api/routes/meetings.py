from fastapi import APIRouter

router = APIRouter(
    prefix="/meetings",
    tags=["Meetings"]
)


@router.get("/")
def get_meetings():
    return {"message": "Meetings router placeholder"}