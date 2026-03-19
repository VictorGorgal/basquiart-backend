docker compose -f database/docker-compose.yml up -d --force-recreate

if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate
pip install -r requirements.txt

pause
