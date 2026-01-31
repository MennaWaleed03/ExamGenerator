from sqlalchemy import Table,Column, Integer, String, Boolean, ForeignKey,UUID, DateTime,Enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from src.db.main import Base

import uuid
from sqlalchemy.sql import func
from src.enums import ObjectiveEnum,DifficultyEnum,ExamStatus


exam_question_table = Table(
    "exam_question",
    Base.metadata,
    Column("exam_id", ForeignKey("exams.id"), primary_key=True),
    Column("question_id", ForeignKey("questions.id"), primary_key=True)
)

class Course(Base):
    __tablename__ = "courses"

    id= Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4,index=True)
    name = Column(String, index=True)
    number_of_chapters = Column(Integer,nullable=False)
    created_at= Column( DateTime(timezone=True),
        server_default=func.now())
    updated_at= Column( DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now())
    
    chapters = relationship("Chapter", back_populates="course", cascade="all, delete-orphan")

    exams= relationship("Exam",back_populates="course",cascade="all, delete-orphan")

class Chapter(Base):
    __tablename__ = "chapters"

    id= Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4,index=True)
    course_id = Column(UUID, ForeignKey("courses.id"), nullable=False)
    chapter_number = Column(Integer,nullable=False)
    completed = Column(Boolean,nullable=False,default=False)
    created_at= Column( DateTime(timezone=True),
        server_default=func.now())
    updated_at= Column( DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now())
    
    course = relationship("Course", back_populates="chapters")
    questions = relationship("Question", back_populates="chapter", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id= Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4,index=True)
    chapter_id = Column(UUID, ForeignKey("chapters.id"),nullable=False)
    content = Column(String,nullable=False)
    difficulty = Column(Enum(DifficultyEnum),nullable=False) #type:ignore
    objective = Column(Enum(ObjectiveEnum),nullable=False) #type:ignore
    created_at= Column( DateTime(timezone=True),
        server_default=func.now())
    updated_at= Column( DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now())
    
    chapter = relationship("Chapter", back_populates="questions")
    choices = relationship("Choice", back_populates="question", cascade="all, delete-orphan")
    exams= relationship("Exam",secondary=exam_question_table,back_populates="questions")

class Choice(Base):
    __tablename__ = "choices"

    id= Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4,index=True)
    question_id = Column(UUID, ForeignKey("questions.id"),nullable=False)
    content = Column(String,nullable=False)
    is_correct = Column(Boolean, nullable=False ,default=False)
    created_at= Column( DateTime(timezone=True),
        server_default=func.now())
    updated_at= Column( DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now())
    
    question = relationship("Question", back_populates="choices")

class Exam(Base):
    __tablename__="exams"

    id= Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4,index=True)

    status = Column(Enum(ExamStatus),nullable=False,default=ExamStatus.draft)#type:ignore
    constraints=Column(JSONB,nullable=False)
    course_id=Column(UUID,ForeignKey("courses.id"),nullable=False)

    created_at= Column( DateTime(timezone=True),
        server_default=func.now())
    
    updated_at= Column( DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now())
    
    course= relationship("Course",back_populates="exams")
    questions=relationship(
        "Question",secondary=exam_question_table,back_populates="exams"
    )
    
