import uuid
import pytest
from unittest.mock import MagicMock
from starlette.testclient import TestClient

from backend.app.main import app
from backend.app.domains.ai.models import AIKnowledgeChunk
from backend.app.domains.ai.services import AIKnowledgeRetrievalService
from backend.app.security.abac import ABACUserContext

client = TestClient(app)


def test_ai_copilot_query_endpoint():
    payload = {
        "prompt": "Evaluate procurement delay and logistics supply chain risk."
    }
    response = client.post("/api/v1/ai/copilot/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "recommendation" in data
    assert "confidence_score" in data
    assert "business_reasoning" in data
    assert "data_sources" in data
    assert "risk_classification" in data
    assert data["confidence_score"] == 0.92
    assert isinstance(data["data_sources"], list)


@pytest.mark.asyncio
async def test_ai_knowledge_retrieval_service():
    tenant_id = uuid.uuid4()
    user = ABACUserContext(
        user_id=uuid.uuid4(),
        tenant_id=tenant_id,
        role="Admin",
        assigned_branches=[],
        is_platform_admin=False
    )
    mock_db = MagicMock()
    mock_result = MagicMock()
    
    mock_result.scalars.return_value.all.return_value = [
        "Fleet telemetry indicates low operational latency."
    ]
    mock_db.execute.return_value = mock_result

    results = await AIKnowledgeRetrievalService.semantic_search_context(
        db=mock_db,
        user=user,
        query_embedding=[0.01] * 1536,
        limit=3
    )

    assert len(results) == 1
    assert results[0] == "Fleet telemetry indicates low operational latency."
