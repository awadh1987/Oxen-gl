from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


class JournalPostingError(ValueError):
    pass


@dataclass
class JournalLine:
    account: str
    debit: float = 0.0
    credit: float = 0.0
    description: str = ""


@dataclass
class JournalEntry:
    id: str
    entry_number: str
    description: str
    lines: list[JournalLine] = field(default_factory=list)
    status: str = "Draft"
    posted_by: str | None = None
    posted_at: datetime | None = None


def validate_journal_entry(entry: JournalEntry) -> None:
    if not entry.entry_number.strip():
        raise JournalPostingError("Journal entry number is required.")
    if not entry.lines:
        raise JournalPostingError("Journal entry must include at least one financial line.")

    total_debit = 0.0
    total_credit = 0.0

    for line in entry.lines:
        if not line.account.strip():
            raise JournalPostingError("Every journal line requires an account.")
        if line.debit < 0 or line.credit < 0:
            raise JournalPostingError("Journal line amounts cannot be negative.")
        total_debit += line.debit
        total_credit += line.credit

    if total_debit <= 0 or total_credit <= 0:
        raise JournalPostingError("Journal entry must contain positive debit and credit totals.")

    if abs(total_debit - total_credit) > 0.01:
        raise JournalPostingError("Journal entry is not balanced.")


def post_journal_entry(entry: JournalEntry, posted_by: str) -> JournalEntry:
    validate_journal_entry(entry)
    if entry.status == "Posted":
        raise JournalPostingError("Journal entry has already been posted.")

    entry.status = "Posted"
    entry.posted_by = posted_by
    entry.posted_at = datetime.now(timezone.utc)
    return entry
