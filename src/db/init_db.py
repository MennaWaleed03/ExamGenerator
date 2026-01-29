from src.db.main import engine,Base



async def create_db():
    async with engine.begin() as conn:
        from src.db.models import Course,Chapter,Question,Choice,Exam
        await conn.run_sync(Base.metadata.create_all)
