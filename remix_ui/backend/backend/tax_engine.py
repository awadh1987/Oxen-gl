from decimal import Decimal, ROUND_HALF_UP

from .settings import get_default_vat_rate


def calculate_vat(gross_amount: Decimal, tax_rate: Decimal | None = None) -> Decimal:
    tax_rate = get_default_vat_rate() if tax_rate is None else tax_rate
    if gross_amount <= 0:
        raise ValueError("gross_amount must be greater than zero")
    if tax_rate < 0:
        raise ValueError("tax_rate cannot be negative")
    return (gross_amount - (gross_amount / (Decimal("1") + tax_rate))).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )