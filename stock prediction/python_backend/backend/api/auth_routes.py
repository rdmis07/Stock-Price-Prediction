"""Authentication routes: signup, login, profile."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.database.models import User
from backend.utils.auth import (
    create_access_token, get_current_user, hash_password, verify_password,
)

router = APIRouter()


class SignupBody(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/signup", response_model=TokenResponse, status_code=201)
def signup(body: SignupBody, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(409, "Email already registered")

    user = User(name=body.name, email=body.email, password_hash=hash_password(body.password))
    db.add(user); db.commit(); db.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": user.email, "name": user.name})
    return TokenResponse(access_token=token, user={"id": user.id, "name": user.name, "email": user.email})


@router.post("/login", response_model=TokenResponse)
def login(body: LoginBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    token = create_access_token({"sub": str(user.id), "email": user.email, "name": user.name})
    return TokenResponse(access_token=token, user={"id": user.id, "name": user.name, "email": user.email})


@router.get("/me")
def me(current=Depends(get_current_user)):
    return current
