from sqlalchemy.ext.asyncio import AsyncSession,async_sessionmaker, create_async_engine
from src.config.settings import get_settings
from sqlalchemy.ext.declarative import declarative_base
from typing import AsyncGenerator

Base=declarative_base()
db_url=get_settings().DATABASE_URL
engine=create_async_engine(db_url)
async_session=async_sessionmaker(bind=engine,
                                 class_=AsyncSession,
                                 autoflush=False,
                                 expire_on_commit=False)

async def get_session()->AsyncGenerator[AsyncSession,None]:
    async with async_session() as session:
        yield session