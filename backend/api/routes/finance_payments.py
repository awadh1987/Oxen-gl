"""
Moyasar Payment Verification Route for Tenant B2B Invoices (KSA Settlement).
Verifies transactions server-to-server with the Moyasar API and updates invoice payment status.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Any, Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

try:
    from backend.database import get_db
    from backend.models import Invoice
except ImportError:
    from database import get_db
    from models import Invoice

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/finance", tags=["Tenant Invoices"])
MOYASAR_SECRET_KEY = os.getenv("MOYASAR_SECRET_KEY", "")


@router.post("/payments/moyasar/verify/{invoice_id}", status_code=status.HTTP_200_OK)
@router.post("/moyasar/verify/{invoice_id}", status_code=status.HTTP_200_OK)
async def verify_moyasar_payment(
    invoice_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Server-to-server verification of a Moyasar payment for a given invoice.
    Queries the Moyasar gateway, validates payment completion and amount parity,
    and updates the invoice record to paid.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON request body",
        )

    payment_id = body.get("id") or body.get("payment_id")
    if not payment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction ID required",
        )

    invoice = None
    if str(invoice_id).isdigit():
        invoice = db.query(Invoice).filter(Invoice.id == int(invoice_id)).first()
    if not invoice:
        invoice = db.query(Invoice).filter(Invoice.invoice_number == str(invoice_id)).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    secret_key = os.getenv("MOYASAR_SECRET_KEY", MOYASAR_SECRET_KEY)
    gateway_url = f"https://api.moyasar.com/v1/payments/{payment_id}"

    try:
        response = requests.get(
            gateway_url,
            auth=(secret_key, ""),
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.error(f"Network error querying Moyasar API: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to communicate with Moyasar payment gateway",
        )

    if response.status_code != 200:
        logger.warning(
            "Moyasar verification failed for transaction %s: status_code=%s, response=%s",
            payment_id,
            response.status_code,
            response.text,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gateway verification failed",
        )

    try:
        payment_record = response.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Invalid response from Moyasar payment gateway",
        )

    # Validate payment status
    if payment_record.get("status") != "paid":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Payment not completed",
        )

    # Validate amount parity: Moyasar amounts are provided in Halalas (1 SAR = 100 Halalas)
    payment_amount = payment_record.get("amount")
    expected_halalas = int(round(float(invoice.total_amount) * 100))
    if payment_amount is not None:
        # Check against halalas or major unit equivalent
        if payment_amount != expected_halalas and abs(float(payment_amount) - float(invoice.total_amount)) > 0.01:
            logger.warning(
                "Moyasar payment amount mismatch: gateway=%s, invoice_expected_halalas=%s, invoice_total=%s",
                payment_amount,
                expected_halalas,
                invoice.total_amount,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount mismatch between gateway and invoice",
            )

    # Persist verified payment details
    invoice.payment_status = "paid"
    invoice.moyasar_transaction_id = payment_id
    source_type = payment_record.get("source", {}).get("type", "card")
    invoice.payment_method = source_type
    from datetime import timezone
    invoice.paid_at = datetime.now(timezone.utc).replace(tzinfo=None)

    db.commit()

    logger.info(
        "Moyasar payment verified successfully for invoice %s (ID: %s): transaction_id=%s, method=%s",
        invoice.invoice_number,
        invoice.id,
        payment_id,
        invoice.payment_method,
    )

    return {
        "status": "paid",
        "transaction_id": payment_id,
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "amount": float(invoice.total_amount),
        "currency": invoice.currency,
        "payment_method": invoice.payment_method,
    }


@router.get("/invoices/public/{token}", status_code=status.HTTP_200_OK)
@router.get("/payments/invoices/public/{token}", status_code=status.HTTP_200_OK)
async def get_public_invoice(
    token: str,
    db: Session = Depends(get_db),
):
    """
    Public, unauthenticated retrieval of invoice metadata by public magic link token.
    Exposes only a safe subset of data for external checkout/verification without
    exposing internal tenant/vendor IDs or sensitive accounting details.
    """
    invoice = db.query(Invoice).filter(Invoice.public_token == token).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "total_amount": float(invoice.total_amount),
        "currency": invoice.currency,
        "payment_status": invoice.payment_status,
        "paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
        "payment_method": invoice.payment_method,
    }

