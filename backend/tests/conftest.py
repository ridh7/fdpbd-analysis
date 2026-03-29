from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from main import app

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def sample_data_path() -> Path:
    return FIXTURES_DIR / "sample_data.txt"
