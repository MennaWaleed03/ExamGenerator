from src.services.UserService import user_service
from src.db.models import Teacher
from src.db.main import get_session
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi.exceptions import HTTPException
from src.auth.utils import decode_token
from fastapi import status,Request,Depends

class AccessTokenBearer:

    async def __call__(self, request:Request):
        token=request.cookies.get('access_token')
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        payload=decode_token(token=token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Couldn't decod token"
            )

        return payload
        
        
class RefreshTokenBearer:

    async def __call__(self, request:Request):
        token=request.cookies.get('refresh_token')
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        payload=decode_token(token=token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Couldn't decod token"
            )

        return payload