"""JWT + password hashing tests."""
from backend.utils.auth import create_access_token, decode_token, hash_password, verify_password


def test_password_round_trip():
    h = hash_password("secret123")
    assert verify_password("secret123", h)
    assert not verify_password("wrong", h)


def test_jwt_round_trip():
    token = create_access_token({"sub": "42", "email": "a@b.c"})
    payload = decode_token(token)
    assert payload["sub"] == "42"
    assert payload["email"] == "a@b.c"
    assert "exp" in payload
