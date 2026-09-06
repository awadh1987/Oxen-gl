import pytest

from backend.backend.journal_posting import JournalEntry, JournalLine, JournalPostingError, post_journal_entry, validate_journal_entry


def test_valid_journal_entry_passes_validation():
    entry = JournalEntry(
        id='je-1',
        entry_number='JE-1001',
        description='Initial posting',
        lines=[
            JournalLine(account='Cash', debit=1000, credit=0),
            JournalLine(account='Sales', debit=0, credit=1000),
        ],
    )
    validate_journal_entry(entry)


def test_unbalanced_journal_entry_fails():
    with pytest.raises(JournalPostingError):
        validate_journal_entry(JournalEntry(
            id='je-2',
            entry_number='JE-1002',
            description='Bad posting',
            lines=[
                JournalLine(account='Cash', debit=2000, credit=0),
                JournalLine(account='Sales', debit=0, credit=1500),
            ],
        ))


def test_post_journal_entry_records_poster_and_status():
    entry = JournalEntry(
        id='je-3',
        entry_number='JE-1003',
        description='Approved posting',
        lines=[
            JournalLine(account='Inventory', debit=800, credit=0),
            JournalLine(account='Payables', debit=0, credit=800),
        ],
    )
    posted = post_journal_entry(entry, 'accountant@meayon.local')
    assert posted.status == 'Posted'
    assert posted.posted_by == 'accountant@meayon.local'
    assert posted.posted_at is not None
