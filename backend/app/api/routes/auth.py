from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Response
from fastapi.security import OAuth2PasswordRequestForm

from sqlalchemy.orm import Session

from app.core.database import get_db

from app.core.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

from app.models.user import User

from app.schemas.auth import RegisterRequest

print("AUTH ROUTER LOADED:", __file__)
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

@router.post("/register")
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):

    existing_email = (
        db.query(User)
        .filter(User.email == payload.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    existing_emp_id = (
        db.query(User)
        .filter(User.bank_emp_id == payload.bank_emp_id)
        .first()
    )

    if existing_emp_id:
        raise HTTPException(
            status_code=400,
            detail="Employee ID already exists",
        )

    user = User(
        bank_emp_id=payload.bank_emp_id,
        name=payload.name,
        email=payload.email,
        designation=payload.designation,
        hashed_password=hash_password(
            payload.password
        ),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": str(user.id),
        "email": user.email,
    }

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):

    user = (
        db.query(User)
        .filter(
            User.bank_emp_id == form_data.username
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    if not verify_password(
        form_data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "bank_emp_id": user.bank_emp_id,
        }
    )
    
    return {
        "message":"Login successful",
        "access_token": access_token,
        "token_type": "bearer",
    }

@router.get("/me")
def me(
    current_user: User = Depends(
        get_current_user
    )
):
    return {
        "id": str(current_user.id),
        "bank_emp_id": current_user.bank_emp_id,
        "name": current_user.name,
        "email": current_user.email,
        "designation": current_user.designation,
        "role": current_user.role,
    }

@router.post("/logout")
def logout(response: Response):

    return {
        "message": "Logged out"
    }