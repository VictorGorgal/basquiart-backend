import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.staticfiles import StaticFiles

from features.core.database import db


@asynccontextmanager
async def lifespan(_):
    # Startup
    await db.connect()

    yield

    # Shutdown
    await db.disconnect()


app = FastAPI(lifespan=lifespan)

