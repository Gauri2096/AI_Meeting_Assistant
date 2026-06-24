from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    bank_emp_id: str
    name: str
    email: EmailStr
    password: str
    designation: str | None = None


class UserResponse(BaseModel):
    id: str
    bank_emp_id: str
    name: str
    email: EmailStr
    designation: str | None = None
    role: str