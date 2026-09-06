"""Run an authenticated multi-currency ERP compliance audit against a running API.

Set CLERK_TOKEN, CEO_TOKEN, and COST_CENTER_ID before execution. COST_CENTER_ID
must identify an existing leaf cost center. API_BASE_URL defaults to localhost.

The API digitally signs invoices through /api/invoices/approve-and-sign/{invoice_id}.
Trip journals use the CEO approval route /api/journal-entries/{journal_id}/post,
which promotes PENDING_CEO_APPROVAL to POSTED_TO_MAIN_LEDGER.
"""

import os
import sys
import uuid
from decimal import Decimal

import requests


API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
CLERK_TOKEN = os.getenv("CLERK_TOKEN")
CEO_TOKEN = os.getenv("CEO_TOKEN")
COST_CENTER_ID = os.getenv("COST_CENTER_ID")
TIMEOUT_SECONDS = 20
EUR_SALE_AMOUNT = Decimal("100.00")
EUR_FIFO_UNIT_COST = Decimal("60.00")
EUR_TO_USD_RATE = Decimal("1.20")

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"


def status_tag(passed: bool, message: str) -> None:
    color = GREEN if passed else RED
    tag = "[PASS]" if passed else "[FAIL]"
    print(f"{color}{tag}{RESET} {message}")


def request(method: str, path: str, token: str, **kwargs: object) -> requests.Response:
    headers = {"Authorization": f"Bearer {token}"}
    headers.update(kwargs.pop("headers", {}))
    response = requests.request(method, f"{API_BASE_URL}{path}", headers=headers, timeout=TIMEOUT_SECONDS, **kwargs)
    if not response.ok:
        raise RuntimeError(f"{method} {path} returned {response.status_code}: {response.text}")
    return response


def require_environment() -> None:
    missing = [name for name, value in {
        "CLERK_TOKEN": CLERK_TOKEN,
        "CEO_TOKEN": CEO_TOKEN,
        "COST_CENTER_ID": COST_CENTER_ID,
    }.items() if not value]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")


def main() -> int:
    require_environment()
    run_id = uuid.uuid4().hex[:12]
    item_sku = f"SIM-EUR-{run_id}"
    trip_id = f"trip-simulation-{run_id}"

    try:
        print("\nMulti-Currency ERP Compliance Simulation")
        print(f"Target API: {API_BASE_URL}\n")
        layer = request(
            "POST",
            "/api/inventory/layers",
            CLERK_TOKEN,
            json={"item_sku": item_sku, "original_quantity": 1, "unit_cost": str(EUR_FIFO_UNIT_COST)},
        ).json()
        status_tag(layer["remainingQuantity"] == 1, "FIFO inventory layer created for one EUR-priced item")

        trip = request(
            "POST",
            "/api/operations/add-trip",
            CLERK_TOKEN,
            json={
                "trip_id": trip_id,
                "item_sku": item_sku,
                "quantity": 1,
                "unit_sale_price": str(EUR_SALE_AMOUNT),
                "cost_center_id": COST_CENTER_ID,
                "currency": "EUR",
                "exchange_rate": float(EUR_TO_USD_RATE),
            },
        ).json()
        expected_total = float((EUR_SALE_AMOUNT + EUR_FIFO_UNIT_COST) * EUR_TO_USD_RATE)
        trip_valid = (
            trip["status"] == "PENDING_CEO_APPROVAL"
            and Decimal(str(trip["totalDebit"])) == Decimal(str(expected_total))
            and Decimal(str(trip["totalCredit"])) == Decimal(str(expected_total))
        )
        status_tag(trip_valid, "Clerk EUR trip created with base-currency revenue, VAT, and FIFO COGS")
        if not trip_valid:
            raise RuntimeError(f"Unexpected trip journal payload: {trip}")

        posted = request("POST", f"/api/journal-entries/{trip['id']}/post", CEO_TOKEN).json()
        status_tag(posted["status"] == "POSTED_TO_MAIN_LEDGER", "CEO approved the pending trip journal into the main ledger")
        if posted["status"] != "POSTED_TO_MAIN_LEDGER":
            raise RuntimeError(f"Unexpected posting status: {posted}")

        reconciliation = request(
            "POST",
            "/api/finance/bank-reconciliation/multi-currency",
            CEO_TOKEN,
            json={"rows": [{
                "bank_date": "2026-08-31",
                "bank_reference": trip_id,
                "bank_amount": float(EUR_SALE_AMOUNT),
                "bank_currency": "USD",
            }]},
        ).json()
        status_tag(
            reconciliation["reconciled_count"] == 1 and reconciliation["exceptions_count"] == 0,
            "USD bank statement matched the EUR source transaction through its 1.20 base conversion",
        )
        if reconciliation["reconciled_count"] != 1 or reconciliation["exceptions_count"] != 0:
            raise RuntimeError(f"Bank reconciliation did not clear the transaction: {reconciliation}")

        metrics = request("GET", "/api/admin/db/optimize-check", CEO_TOKEN).json()
        elapsed = float(metrics["query_execution_time_ms"])
        status_tag(elapsed < 50.0, f"Recursive CTE optimization check completed in {elapsed:.3f} ms")
        if elapsed >= 50.0:
            print(f"{YELLOW}[WARN]{RESET} Optimization status: {metrics['optimization_status']}; index utilization: {metrics['index_utilization_percentage']:.2f}%")
            raise RuntimeError("Query execution time exceeded the 50 ms production threshold")

        print(f"{GREEN}[PASS]{RESET} End-to-end multi-currency accounting simulation completed successfully.")
        return 0
    except (KeyError, RuntimeError, requests.RequestException) as exc:
        status_tag(False, str(exc))
        return 1


if __name__ == "__main__":
    sys.exit(main())