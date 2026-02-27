from passlib.context import CryptContext
from datetime import timedelta,datetime
from src.config.settings import get_settings
import jwt
import uuid
import logging

settings=get_settings()
password_context=CryptContext(
    schemes=['bcrypt']
)

ACCESS_TOKEN_EXPIRY=3600

def generate_password_hash(password:str)->str:
    """This take a plain string password and convert it into hashed one"""
    hash_password=password_context.hash(password)
    return hash_password

def verify_password(password,hash_pasword):
    return password_context.verify(password,hash_pasword)

def create_access_token(user_data:dict, refresh:bool=False,expiry:timedelta|None=None):
    payload:dict={}
    now=datetime.utcnow()
    expire_at=now+(expiry if expiry else timedelta(seconds=ACCESS_TOKEN_EXPIRY))
    payload["user"]=user_data
    payload["exp"]=expire_at
    payload["jti"]=str(uuid.uuid4())
    payload["refresh"]=refresh

    token= jwt.encode(payload=payload,key=settings.JWT_SECRET,algorithm=settings.JWT_ALGORITHM)
    return token

def decode_token(token:str)->dict|None:
    try:
        token_data= jwt.decode(jwt=token,
                               key=settings.JWT_SECRET,
                               algorithms=settings.JWT_ALGORITHM)
        return token_data
    except jwt.PyJWTError as e:
        logging.exception(e)
        return None
