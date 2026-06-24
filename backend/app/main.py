from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.meetings import router as meetings_router
from app.api.routes.auth import router as auth_router
print("MAIN LOADED:", __file__)
app = FastAPI(
    title="Meeting Assistant API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    meetings_router,
    prefix="/meetings",
    tags=["Meetings"]
)
app.include_router(auth_router)

@app.get("/health", tags=["System"])
def health():
    raise Exception("HEALTH TEST")