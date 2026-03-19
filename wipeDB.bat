@echo off

docker compose -f database/docker-compose.yml down
docker volume rm database_postgres_data
docker compose -f database/docker-compose.yml up -d

pause