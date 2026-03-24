import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from features.auth.service import AuthService
from features.core.jwt_handler import JWTHandler


@pytest.fixture
def mock_db():
    return SimpleNamespace(
        user=SimpleNamespace(
            find_unique=AsyncMock(),
            create=AsyncMock(),
        ),
    )


@pytest.fixture
def mock_jwt_handler():
    handler = MagicMock(spec=JWTHandler)
    handler.create_token.return_value = "fake-jwt-token"
    return handler


@pytest.fixture
def auth_service(mock_db, mock_jwt_handler):
    return AuthService(mock_db, mock_jwt_handler)