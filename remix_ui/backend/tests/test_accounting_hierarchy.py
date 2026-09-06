from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.backend.accounting_hierarchy import AccountingHierarchyError, get_account_rollup, validate_journal_posting_lines
from backend.backend.database import Base
from backend.backend.models import ChartOfAccount, CostCenter, JournalEntry, JournalLine


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def test_hierarchy_blocks_summary_posting_and_rolls_up_all_descendants(db):
    db.add_all([
        ChartOfAccount(account_code="4000", account_name="Revenue", account_type="Revenue", is_postable=False),
        ChartOfAccount(account_code="4100", account_name="Sales", account_type="Revenue", parent_code="4000", is_postable=False),
        ChartOfAccount(account_code="4110", account_name="Regional Sales", account_type="Revenue", parent_code="4100", is_postable=False),
        ChartOfAccount(account_code="4111", account_name="Route Sales", account_type="Revenue", parent_code="4110", is_postable=True),
        CostCenter(code="OPS", name="Operations", is_leaf=False),
        CostCenter(code="OPS-RIY", name="Riyadh", parent_cc="OPS", is_leaf=True),
        JournalEntry(id="journal-1", entry_number="JE-1", status="Posted", total_debit=0, total_credit=125),
        JournalLine(id="line-1", journal_entry_id="journal-1", account="4111", debit=0, credit=125, cost_center_id="OPS-RIY"),
    ])
    db.commit()

    with pytest.raises(AccountingHierarchyError, match="structural summary"):
        validate_journal_posting_lines(db, [SimpleNamespace(account="4000", cost_center_id="OPS-RIY")])
    with pytest.raises(AccountingHierarchyError, match="leaf cost center"):
        validate_journal_posting_lines(db, [SimpleNamespace(account="4111", cost_center_id="OPS")])

    validate_journal_posting_lines(db, [SimpleNamespace(account="4111", cost_center_id="OPS-RIY")])
    assert get_account_rollup(db, "4000") == {
        "account_code": "4000",
        "total_debit": 0.0,
        "total_credit": 125.0,
        "balance": -125.0,
    }