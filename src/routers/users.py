from fastapi import APIRouter
from fastapi import status,Response
from fastapi.exceptions import HTTPException
from fastapi import Depends
from schemas import UserCreateModel,UserLoginModel,UserModel
from src.auth.utils import generate_password_hash,verify_password,decode_token,create_access_token
from src.config.settings import get_settings
from src.db.main import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from src.services.UserService import user_service
from datetime import timedelta,datetime
from fastapi.responses import JSONResponse
from src.auth.dependencies import RefreshTokenBearer
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import Request
from pathlib import Path
settings=get_settings()
users_router=APIRouter()

REFRESH_TOKEN_EXPIRY=settings.REFRESH_TOKEN_EXPIRY

@users_router.post('/signup',response_model=UserModel,status_code=status.HTTP_201_CREATED)
async def create_user_account(user_data:UserCreateModel,session:AsyncSession=Depends(get_session)):
    email=user_data.email
    teacher=await user_service.get_user_by_email(email=email,session=session)
    if teacher is None:
        new_reacher= await user_service.create_user(user_data=user_data
                                                    ,session=session)
        return new_reacher
    else:
        raise HTTPException(status_code=status.HTTP_302_FOUND,detail="User already exist")
    
@users_router.post('/login')
async def login_users(login_data:UserLoginModel,response:Response, session:AsyncSession=Depends(get_session)):
    email=login_data.email
    password=login_data.password

    teacher=await user_service.get_user_by_email(email=email,session=session)
    if teacher is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="User doesn't exist")
    password_valid= verify_password(password=password,hash_pasword=teacher.password_hash)
    if not password_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Password is not correct")
    access_token=create_access_token(user_data={
        "email":teacher.email,
        "sub":str(teacher.id),
        },refresh=False)
    refresh_token=create_access_token(user_data={
        "email":teacher.email, #type: ignore
        "sub": str(teacher.id),#type: ignore
    },refresh=True,expiry=timedelta(days=REFRESH_TOKEN_EXPIRY)) 

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.ACCESS_MAX_AGE,
        path='/'
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_MAX_AGE,
        path='/'
    )
    return {"message": "Login successful"}

@users_router.get('/refresh_token')
async def get_new_access_token(user_token_data:dict=Depends(RefreshTokenBearer())):
    expiry_timestamp=user_token_data['exp']
    if datetime.fromtimestamp(expiry_timestamp)>=datetime.now():
        new_access_token=create_access_token(user_data=user_token_data["user"])
        return JSONResponse(content={
            "access_token":new_access_token
        }) 
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Invalid Token")

templates = Jinja2Templates(directory="src/templates")

@users_router.get("/signup", response_class=HTMLResponse)
async def signup_page(request: Request):
    return templates.TemplateResponse("signup.html", {"request": request})
@users_router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})