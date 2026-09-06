from __future__ import annotations

from typing import Iterable


class JournalValidationError(ValueError):
    pass


def validate_journal_lines(lines: Iterable[object]) -> None:
    line_list = list(lines)
    if not line_list:
        raise JournalValidationError("Journal entry must contain at least one accounting line.")

    total_debit = 0.0
    total_credit = 0.0

    for line in line_list:
        debit = float(getattr(line, "debit", 0) or 0)
        credit = float(getattr(line, "credit", 0) or 0)

        if debit < 0 or credit < 0:
            raise JournalValidationError("Journal line amounts cannot be negative.")

        total_debit += debit
        total_credit += credit

    if total_debit <= 0 or total_credit <= 0:
        raise JournalValidationError("Journal entry must include positive debit and credit totals.")

    if abs(total_debit - total_credit) > 0.01:
        raise JournalValidationError(
            f"Journal entry is not balanced: debit total {total_debit:.2f} does not match credit total {total_credit:.2f}."
        )
