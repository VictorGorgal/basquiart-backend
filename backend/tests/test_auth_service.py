import pytest
from types import SimpleNamespace


@pytest.mark.asyncio
async def test_register_creates_user_and_returns_token(auth_service, mock_db, mock_jwt_handler):
    mock_db.user.find_unique.return_value = None
    mock_db.user.create.return_value = SimpleNamespace(
        id=1,
        username="vinicius",
        password="Senha123!"
    )

    result = await auth_service.register("vinicius", "Senha123!")

    assert result == "fake-jwt-token"
    mock_db.user.find_unique.assert_awaited_once_with(where={"username": "vinicius"})
    mock_db.user.create.assert_awaited_once_with(
        data={
            "username": "vinicius",
            "password": "Senha123!",
        }
    )
    mock_jwt_handler.create_token.assert_called_once_with(1)


@pytest.mark.asyncio
async def test_register_raises_error_when_username_already_exists(auth_service, mock_db, mock_jwt_handler):
    mock_db.user.find_unique.return_value = SimpleNamespace(
        id=1,
        username="vinicius",
        password="Senha123!"
    )

    with pytest.raises(ValueError, match="Username already registered"):
        await auth_service.register("vinicius", "Senha123!")

    mock_db.user.find_unique.assert_awaited_once_with(where={"username": "vinicius"})
    mock_db.user.create.assert_not_awaited()
    mock_jwt_handler.create_token.assert_not_called()


@pytest.mark.asyncio
async def test_login_returns_token_with_valid_credentials(auth_service, mock_db, mock_jwt_handler):
    mock_db.user.find_unique.return_value = SimpleNamespace(
        id=2,
        username="maria",
        password="Senha123!"
    )

    result = await auth_service.login("maria", "Senha123!")

    assert result == "fake-jwt-token"
    mock_db.user.find_unique.assert_awaited_once_with(where={"username": "maria"})
    mock_jwt_handler.create_token.assert_called_once_with(2)


@pytest.mark.asyncio
async def test_login_raises_error_when_user_does_not_exist(auth_service, mock_db, mock_jwt_handler):
    mock_db.user.find_unique.return_value = None

    with pytest.raises(ValueError, match="Invalid credentials"):
        await auth_service.login("maria", "Senha123!")

    mock_db.user.find_unique.assert_awaited_once_with(where={"username": "maria"})
    mock_jwt_handler.create_token.assert_not_called()


@pytest.mark.asyncio
async def test_login_raises_error_when_password_is_wrong(auth_service, mock_db, mock_jwt_handler):
    mock_db.user.find_unique.return_value = SimpleNamespace(
        id=2,
        username="maria",
        password="OutraSenha123!"
    )

    with pytest.raises(ValueError, match="Invalid credentials"):
        await auth_service.login("maria", "Senha123!")

    mock_db.user.find_unique.assert_awaited_once_with(where={"username": "maria"})
    mock_jwt_handler.create_token.assert_not_called()