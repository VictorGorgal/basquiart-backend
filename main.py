import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
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

app.include_router(auth_router)
app.include_router(group_router)
app.include_router(post_router)
