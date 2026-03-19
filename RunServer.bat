call venv\Scripts\activate

prisma generate
prisma db push

uvicorn main:app --reload

pause
