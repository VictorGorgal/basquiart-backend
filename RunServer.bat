call venv\Scripts\activate

prisma generate
prisma db push
python prisma/seed.py

uvicorn main:app --reload

pause
