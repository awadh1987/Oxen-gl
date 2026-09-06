import pytest

from backend.backend.financial_validation import JournalValidationError, validate_journal_lines


class Line:
    def __init__(self, debit: float, credit: float):
        self.debit = debit
        self.credit = credit


def test_valid_journal_lines_are_accepted():
    lines = [Line(2000, 0), Line(0, 2000)]
    validate_journal_lines(lines)


def test_unbalanced_journal_lines_fail():
    with pytest.raises(JournalValidationError):
        validate_journal_lines([Line(1500, 0), Line(0, 1000)])


def test_negative_entries_fail():
    with pytest.raises(JournalValidationError):
        validate_journal_lines([Line(-100, 0), Line(0, 100)])
