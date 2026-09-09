#!/usr/bin/env python3
"""
Step 4 Tax (VAT) Calculation Engine & 5-Line Matrix Simulation
Executable in standalone Python 3 standard library.
"""

from decimal import Decimal, ROUND_HALF_UP
import json
import sys

GREEN = "\033[92m"
RED = "\033[91m"
RESET = "\033[0m"


def status_tag(passed: bool, message: str, details: str = None) -> None:
    color = GREEN if passed else RED
    tag = "[PASS]" if passed else "[FAIL]"
    print(f"{color}{tag}{RESET} {message}")
    if details:
        print(f"       {details}")


def calculate_vat(gross_amount: Decimal, tax_rate: Decimal = Decimal("0.15")) -> dict:
    gross = Decimal(str(gross_amount))
    rate = Decimal(str(tax_rate))
    tax_amount = (gross - (gross / (Decimal("1") + rate))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    net_revenue = (gross - tax_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return {
        "gross": gross,
        "tax_amount": tax_amount,
        "net_revenue": net_revenue,
        "rate": rate,
    }


def generate_five_line_journal(gross_amount: Decimal, cogs_cost: Decimal, leaf_cost_center: str) -> dict:
    vat_calc = calculate_vat(gross_amount, Decimal("0.15"))
    gross = vat_calc["gross"]
    net_rev = vat_calc["net_revenue"]
    tax = vat_calc["tax_amount"]
    cogs = Decimal(str(cogs_cost))

    lines = [
        {"account_code": "1101", "name": "Main Bank Cash / AR", "debit": gross, "credit": Decimal("0.00"), "cost_center": None},
        {"account_code": "4101", "name": "Sales Revenue Net", "debit": Decimal("0.00"), "credit": net_rev, "cost_center": leaf_cost_center},
        {"account_code": "2201", "name": "VAT Collected Liability (15%)", "debit": Decimal("0.00"), "credit": tax, "cost_center": None},
        {"account_code": "5101", "name": "COGS Expense", "debit": cogs, "credit": Decimal("0.00"), "cost_center": leaf_cost_center},
        {"account_code": "1201", "name": "Inventory / AP", "debit": Decimal("0.00"), "credit": cogs, "cost_center": None},
    ]

    total_debit = sum(l["debit"] for l in lines)
    total_credit = sum(l["credit"] for l in lines)
    is_balanced = total_debit == total_credit

    return {
        "vat_calc": vat_calc,
        "lines": lines,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "is_balanced": is_balanced,
        "status": "PENDING_CEO_APPROVAL",
    }


def main() -> int:
    print("\n===============================================================")
    print("   PROMPT 4: TAX (VAT) CALCULATION ENGINE & 5-LINE MATRIX      ")
    print("===============================================================\n")

    passed_count = 0
    total_count = 0

    def run_check(name: str, condition: bool, details: str = None):
        nonlocal passed_count, total_count
        total_count += 1
        if condition:
            passed_count += 1
            status_tag(True, name, details)
        else:
            status_tag(False, name, details)

    # 1. Formula validation
    vat = calculate_vat(Decimal("160.00"), Decimal("0.15"))
    run_check(
        "VAT calculation extracts 15% from Gross (Gross - Gross/1.15)",
        vat["tax_amount"] == Decimal("20.87") and vat["net_revenue"] == Decimal("139.13"),
        f"Gross: 160.00 -> Net Revenue: {vat['net_revenue']} SAR | VAT 2201: {vat['tax_amount']} SAR",
    )

    # 2. 5-Line balanced matrix
    entry = generate_five_line_journal(Decimal("160.00"), Decimal("100.00"), "CC-OPS-01")
    run_check(
        "Double-entry matrix generates exactly 5 lines",
        len(entry["lines"]) == 5,
        f"Line count: {len(entry['lines'])}",
    )

    run_check(
        "Debit strictly equals Credit (Zero Variance)",
        entry["is_balanced"] and entry["total_debit"] == Decimal("260.00") and entry["total_credit"] == Decimal("260.00"),
        f"Debit: {entry['total_debit']} SAR == Credit: {entry['total_credit']} SAR",
    )

    # 3. Account specifics & cost centers
    l1, l2, l3, l4, l5 = entry["lines"]
    run_check(
        "Line 1 (1101 Debit): Gross Amount 160.00 SAR (cost_center=None)",
        l1["account_code"] == "1101" and l1["debit"] == Decimal("160.00") and l1["cost_center"] is None,
        f"Debit: {l1['debit']}, Account: {l1['account_code']}",
    )
    run_check(
        "Line 2 (4101 Credit): Net Revenue 139.13 SAR (cost_center='CC-OPS-01')",
        l2["account_code"] == "4101" and l2["credit"] == Decimal("139.13") and l2["cost_center"] == "CC-OPS-01",
        f"Credit: {l2['credit']}, Account: {l2['account_code']}",
    )
    run_check(
        "Line 3 (2201 Credit): VAT Liability 20.87 SAR (cost_center=None)",
        l3["account_code"] == "2201" and l3["credit"] == Decimal("20.87") and l3["cost_center"] is None,
        f"Credit: {l3['credit']}, Account: {l3['account_code']}",
    )
    run_check(
        "Line 4 (5101 Debit): COGS Expense 100.00 SAR (cost_center='CC-OPS-01')",
        l4["account_code"] == "5101" and l4["debit"] == Decimal("100.00") and l4["cost_center"] == "CC-OPS-01",
        f"Debit: {l4['debit']}, Account: {l4['account_code']}",
    )
    run_check(
        "Line 5 (1201 Credit): Inventory Asset / AP 100.00 SAR (cost_center=None)",
        l5["account_code"] == "1201" and l5["credit"] == Decimal("100.00") and l5["cost_center"] is None,
        f"Credit: {l5['credit']}, Account: {l5['account_code']}",
    )

    # 4. Status Quarantine
    run_check(
        "Initial status is quarantined under PENDING_CEO_APPROVAL",
        entry["status"] == "PENDING_CEO_APPROVAL",
        f"Status: {entry['status']}",
    )

    print("\n---------------------------------------------------------------")
    print(f"  SIMULATION SUMMARY: {passed_count}/{total_count} CHECKS PASSED")
    print("---------------------------------------------------------------\n")

    if passed_count == total_count:
        print(f"{GREEN}[SUCCESS]{RESET} All Tax Engine and 5-Line Matrix requirements verified successfully!\n")
        return 0
    else:
        print(f"{RED}[FAILURE]{RESET} Some checks failed!\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
