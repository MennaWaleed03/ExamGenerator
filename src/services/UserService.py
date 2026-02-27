from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import Teacher,Course
from schemas import UserCreateModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.auth.utils import generate_password_hash,verify_password


class UserService:
    async def get_user_by_email(self,email,session:AsyncSession)->Teacher|None:
        statement=select(Teacher).options(selectinload(Teacher.courses)).where(Teacher.email==email)
        result=await session.execute(statement=statement)
        teacher=result.scalars().first()

        return teacher if teacher is not None else None
    
    async def create_user(self,user_data:UserCreateModel,session:AsyncSession):
        user_data_dict=user_data.model_dump(exclude={"password"})
        new_teacher=Teacher(**user_data_dict)
        new_teacher.password_hash=generate_password_hash(user_data.password) #type:ignore
        session.add(new_teacher)
        await session.commit()
        await session.refresh(new_teacher)
        stmt=select(Teacher).options(selectinload(Teacher.courses)).where(Teacher.id==new_teacher.id)

        teacher_with_courses=(await session.execute(stmt)).scalars().first()
        return teacher_with_courses
        

user_service=UserService()