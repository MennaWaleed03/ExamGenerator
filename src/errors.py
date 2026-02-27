from fastapi.requests import Request
from fastapi.exceptions import RequestValidationError,HTTPException
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.responses import Response, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from pathlib import Path
from fastapi import status
from uuid import UUID
BASE_DIR = Path(__file__).resolve().parent  # src
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


class Errors:

    def __init__(self):
        self.allowed_courses_extensions=['chapters','Exam','exams']
        self.allowed_exams_extensions=['questions']
        self.allowed_chapters_extensions=['questions']

    def validation_exception_handler(self,request: Request, exc: RequestValidationError):
        print("VALIDATION HIT:", request.url.path)
        print("VALIDATION ERRORS:", exc.errors())   # ✅ prints the exact missing fields
        print("BODY:", exc.body)                    # ✅ prints payload if available

        if request.url.path.startswith("/courses"):
                return templates.TemplateResponse(
                    "errors/invalid_course.html",
                    {"request": request},
                    status_code=404
                )
        if request.url.path.startswith("/exams"):
                return templates.TemplateResponse(
                    "errors/invalid_exam.html",
                    {"request": request},
                    status_code=404
                )
        if request.url.path.startswith("/chapters"):
                return templates.TemplateResponse(
                    "errors/invalid_chapter.html",
                    {"request": request},
                    status_code=404
                )
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors()},
        )
    
    async def handle_courses_errors(self,request:Request,parts):
        if len(parts)==2:
                    print(parts)
                    return templates.TemplateResponse(
                    "errors/invalid_course.html",
                    {"request": request},
                    status_code=404)

        if len(parts) > 2:
                print("here")
                if parts[2] not in self.allowed_courses_extensions:
                    return templates.TemplateResponse(
                        "errors/invalid_url.html",
                        {"request": request},
                        status_code=404
                    )
                

                return templates.TemplateResponse(
                                "errors/invalid_course.html",
                                {"request": request},
                                status_code=404
                            )

    async def handle_exams_errors(self,request:Request,parts):
         
        if len(parts)==2:
                    return templates.TemplateResponse(
                    "errors/invalid_exam.html",
                    {"request": request},
                    status_code=404)

        if len(parts) > 2:
                        

            if parts[2] not in self.allowed_exams_extensions:
                return templates.TemplateResponse(
                    "errors/invalid_url.html",
                    {"request": request},
                    status_code=404
                )
                    
    
            return templates.TemplateResponse(
                    "errors/invalid_exam.html",
                    {"request": request},
                    status_code=404
                )

    async def handle_chapters_errors(self,request:Request,parts):
         
        if len(parts)==2:
                    return templates.TemplateResponse(
                    "errors/invalid_chapter.html",
                    {"request": request},
                    status_code=404)

        if len(parts) > 2:
                        

            if parts[2] not in self.allowed_exams_extensions:
                return templates.TemplateResponse(
                    "errors/invalid_url.html",
                    {"request": request},
                    status_code=404
                )
                    
    
            return templates.TemplateResponse(
                    "errors/invalid_chapter.html",
                    {"request": request},
                    status_code=404
                )


    async def http_exception_handler(self, request: Request, exc: StarletteHTTPException) -> Response:
        path = request.url.path
        parts = path.strip("/").split("/")
        print("HTTP HIT Course:", path, exc.status_code)
        print(parts)

        if exc.status_code in [404,405]:
            # CASE 1: invalid course ID (UUID part wrong OR DB not found)
            if path.startswith("/courses/"):
                result=await self.handle_courses_errors(request,parts)
                return result
                

            elif path.startswith("/exams/"):
                result=await self.handle_exams_errors(request,parts)
                return result

            elif path.startswith("/chapters/"):
                result=await self.handle_chapters_errors(request,parts)
                return result
                    
                    
                # fallback: generic invalid URL
            return templates.TemplateResponse(
                    "errors/invalid_url.html",
                    {"request": request},
                    status_code=404
                )
        elif exc.status_code in [403,401]:
              return templates.TemplateResponse(
                    "errors/invalid_token.html",
                    {"request": request},
                    status_code=exc.status_code
                )
              
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )

error_handler=Errors()