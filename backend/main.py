import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from features.core.database import db
from features.auth.router import router as auth_router
from features.group.router import router as group_router
from features.post.router import router as post_router


@asynccontextmanager
async def lifespan(_):
    # Startup
    await db.connect()

    yield

    # Shutdown
    await db.disconnect()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("./database/images", exist_ok=True)
app.mount("/images", StaticFiles(directory="./database/images"), name="images")

app.include_router(auth_router)
app.include_router(group_router)
app.include_router(post_router)
