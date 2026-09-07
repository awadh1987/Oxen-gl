"""ZATCA e-Invoicing Phase 2 Integration Adapter.

Isolated service layer responsible for:
- UBL 2.1 XML structure generation
- SHA-256 invoice hashing and previous hash chaining
- TLV-encoded Base64 QR code generation
- Cryptographic stamp generation
- Clearance (B2B) vs Reporting (B2C) workflow execution
- Transmission failure simulation and retry mechanics
"""

from __future__ import annotations

import base64
import hashlib
import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models


def encode_tlv(tag: int, value: str) -> bytes:
    """Encode a single TLV (Tag-Length-Value) field per ZATCA e-invoicing specification."""
    val_bytes = value.encode("utf-8")
    length = len(val_bytes)
    return bytes([tag, length]) + val_bytes


def generate_zatca_qr_code(
    seller_name: str,
    vat_number: str,
    timestamp: datetime,
    total_amount: Decimal,
    vat_amount: Decimal,
    invoice_hash: str,
    cryptographic_stamp: str,
) -> str:
    """Generate ZATCA Phase 2 compliant TLV Base64 QR Code."""
    tlv_bytes = bytearray()
    tlv_bytes.extend(encode_tlv(1, seller_name))
    tlv_bytes.extend(encode_tlv(2, vat_number))
    tlv_bytes.extend(encode_tlv(3, timestamp.isoformat()))
    tlv_bytes.extend(encode_tlv(4, f"{total_amount:.2f}"))
    tlv_bytes.extend(encode_tlv(5, f"{vat_amount:.2f}"))
    tlv_bytes.extend(encode_tlv(6, invoice_hash))
    tlv_bytes.extend(encode_tlv(7, cryptographic_stamp[:32]))
    return base64.b64encode(tlv_bytes).decode("utf-8")


class ZATCAAdapter:
    """Isolated ZATCA Phase 2 transmission and compliance engine."""

    GENESIS_HASH = "NWZlMWMwMmRhMjA3ZjBhMmQ1MTUzYTM4MGQ2NTY1M2MwODFjMzg4OTdhNzg2N2VlYzA4OWI5Mjc4NjVkZDJjNA=="

    @classmethod
    def generate_xml_ubl(
        cls,
        invoice: models.CustomerInvoice,
        tax_profile: Optional[models.TaxProfile],
        invoice_uuid: str,
        is_b2b: bool = True,
    ) -> str:
        """Simulate UBL 2.1 XML generation for standard or simplified tax invoice."""
        seller_name = tax_profile.legal_name if tax_profile else "شركة ميون للنقل والخدمات اللوجستية"
        seller_vat = tax_profile.tax_id if tax_profile else "300099999900003"
        buyer_name = invoice.customer_name or "Standard Customer"
        buyer_vat = invoice.customer_tax_number or "311111111100003"
        type_code = "0100000" if is_b2b else "0200000"

        return (
            f'<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" '
            f'xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" '
            f'xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">\n'
            f'    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>\n'
            f'    <cbc:ID>{invoice.invoice_number}</cbc:ID>\n'
            f'    <cbc:UUID>{invoice_uuid}</cbc:UUID>\n'
            f'    <cbc:InvoiceTypeCode name="{type_code}">388</cbc:InvoiceTypeCode>\n'
            f'    <cbc:IssueDate>{invoice.issue_date.strftime("%Y-%m-%d")}</cbc:IssueDate>\n'
            f'    <cbc:IssueTime>{invoice.issue_date.strftime("%H:%M:%S")}</cbc:IssueTime>\n'
            f'    <cac:AccountingSupplierParty>\n'
            f'        <cac:Party>\n'
            f'            <cac:PartyLegalEntity>\n'
            f'                <cbc:RegistrationName>{seller_name}</cbc:RegistrationName>\n'
            f'            </cac:PartyLegalEntity>\n'
            f'            <cac:PartyTaxScheme>\n'
            f'                <cbc:CompanyID>{seller_vat}</cbc:CompanyID>\n'
            f'            </cac:PartyTaxScheme>\n'
            f'        </cac:Party>\n'
            f'    </cac:AccountingSupplierParty>\n'
            f'    <cac:AccountingCustomerParty>\n'
            f'        <cac:Party>\n'
            f'            <cac:PartyLegalEntity>\n'
            f'                <cbc:RegistrationName>{buyer_name}</cbc:RegistrationName>\n'
            f'            </cac:PartyLegalEntity>\n'
            f'            <cac:PartyTaxScheme>\n'
            f'                <cbc:CompanyID>{buyer_vat}</cbc:CompanyID>\n'
            f'            </cac:PartyTaxScheme>\n'
            f'        </cac:Party>\n'
            f'    </cac:AccountingCustomerParty>\n'
            f'    <cac:LegalMonetaryTotal>\n'
            f'        <cbc:LineExtensionAmount currencyID="SAR">{invoice.subtotal:.2f}</cbc:LineExtensionAmount>\n'
            f'        <cbc:TaxExclusiveAmount currencyID="SAR">{invoice.subtotal:.2f}</cbc:TaxExclusiveAmount>\n'
            f'        <cbc:TaxInclusiveAmount currencyID="SAR">{invoice.grand_total:.2f}</cbc:TaxInclusiveAmount>\n'
            f'        <cbc:PayableAmount currencyID="SAR">{invoice.grand_total:.2f}</cbc:PayableAmount>\n'
            f'    </cac:LegalMonetaryTotal>\n'
            f'</Invoice>'
        )

    @classmethod
    def get_latest_invoice_hash(cls, database: Session, company_id: uuid.UUID) -> str:
        """Retrieve previous invoice hash for blockchain-like cryptographic chaining."""
        last_log = database.scalar(
            select(models.ZATCALog)
            .where(models.ZATCALog.company_id == company_id, models.ZATCALog.invoice_hash.isnot(None))
            .order_by(models.ZATCALog.created_at.desc())
        )
        return last_log.invoice_hash if last_log and last_log.invoice_hash else cls.GENESIS_HASH

    @classmethod
    def process_invoice(
        cls,
        database: Session,
        company_id: uuid.UUID,
        invoice_id: uuid.UUID,
        invoice_type: str = "b2b",
        simulate_failure: bool = False,
        failure_reason: Optional[str] = None,
    ) -> models.ZATCALog:
        """Process customer invoice for ZATCA Phase 2 Clearance (B2B) or Reporting (B2C)."""
        invoice = database.scalar(
            select(models.CustomerInvoice).where(
                models.CustomerInvoice.id == invoice_id,
                models.CustomerInvoice.company_id == company_id,
            )
        )
        if invoice is None:
            raise ValueError(f"Customer invoice {invoice_id} not found for company {company_id}")

        tax_profile = database.scalar(
            select(models.TaxProfile).where(
                models.TaxProfile.company_id == company_id,
                models.TaxProfile.is_active.is_(True),
            )
        )

        now = datetime.now(timezone.utc)
        is_b2b = invoice_type.lower() in {"b2b", "standard", "tax_invoice"}

        inv_uuid = str(uuid.uuid4())
        xml_payload = cls.generate_xml_ubl(invoice, tax_profile, inv_uuid, is_b2b=is_b2b)
        invoice_hash = hashlib.sha256(xml_payload.encode("utf-8")).hexdigest()
        previous_hash = cls.get_latest_invoice_hash(database, company_id)
        crypto_stamp = hashlib.sha256(f"{invoice_hash}:{previous_hash}:{inv_uuid}".encode("utf-8")).hexdigest()

        seller_name = tax_profile.legal_name if tax_profile else "شركة ميون للنقل والخدمات اللوجستية"
        seller_vat = tax_profile.tax_id if tax_profile else "300099999900003"
        qr_code = generate_zatca_qr_code(
            seller_name=seller_name,
            vat_number=seller_vat,
            timestamp=invoice.issue_date,
            total_amount=invoice.grand_total,
            vat_amount=invoice.vat_amount,
            invoice_hash=invoice_hash,
            cryptographic_stamp=crypto_stamp,
        )

        if simulate_failure:
            submission_status = "FAILED"
            clearance_status = None
            reporting_status = None
            validation_errors = failure_reason or "Simulated transmission failure: connection timeout to ZATCA gateway"
            retry_count = 1
            response_payload = json.dumps({
                "status": "FAILED",
                "error_code": "CF-902",
                "message": validation_errors,
                "timestamp": now.isoformat(),
            })
        else:
            validation_errors = None
            retry_count = 0
            if is_b2b:
                submission_status = "CLEARED"
                clearance_status = "CLEARED"
                reporting_status = None
            else:
                submission_status = "REPORTED"
                clearance_status = None
                reporting_status = "REPORTED"

            response_payload = json.dumps({
                "status": "SUCCESS",
                "zatca_stage": tax_profile.zatca_stage if tax_profile else "simulation",
                "invoice_type": "Standard Tax Invoice" if is_b2b else "Simplified Tax Invoice",
                "clearance_status": clearance_status,
                "reporting_status": reporting_status,
                "timestamp": now.isoformat(),
            })

        log_entry = models.ZATCALog(
            company_id=company_id,
            tax_profile_id=tax_profile.id if tax_profile else None,
            invoice_id=invoice.id,
            invoice_uuid=inv_uuid,
            invoice_hash=invoice_hash,
            previous_invoice_hash=previous_hash,
            xml_payload=xml_payload,
            qr_code_payload=qr_code,
            cryptographic_stamp=crypto_stamp,
            submission_status=submission_status,
            clearance_status=clearance_status,
            reporting_status=reporting_status,
            validation_errors=validation_errors,
            warning_messages=None,
            retry_count=retry_count,
            last_attempt_at=now,
            response_payload=response_payload,
        )

        database.add(log_entry)
        database.commit()
        database.refresh(log_entry)
        return log_entry

    @classmethod
    def retry_submission(
        cls,
        database: Session,
        company_id: uuid.UUID,
        log_id: uuid.UUID,
        simulate_failure: bool = False,
        failure_reason: Optional[str] = None,
    ) -> models.ZATCALog:
        """Retry a failed ZATCA submission."""
        log_entry = database.scalar(
            select(models.ZATCALog).where(
                models.ZATCALog.id == log_id,
                models.ZATCALog.company_id == company_id,
            )
        )
        if log_entry is None:
            raise ValueError(f"ZATCA log entry {log_id} not found for company {company_id}")

        now = datetime.now(timezone.utc)
        log_entry.retry_count += 1
        log_entry.last_attempt_at = now

        if simulate_failure:
            log_entry.submission_status = "FAILED"
            log_entry.validation_errors = failure_reason or f"Retry attempt {log_entry.retry_count} failed: ZATCA gateway 503"
            log_entry.response_payload = json.dumps({
                "status": "FAILED",
                "retry_attempt": log_entry.retry_count,
                "error": log_entry.validation_errors,
                "timestamp": now.isoformat(),
            })
        else:
            # Transition based on invoice type
            is_simplified = (
                "Simplified" in (log_entry.response_payload or "")
                or "0200000" in (log_entry.xml_payload or "")
                or log_entry.reporting_status == "REPORTED"
            )
            if is_simplified:
                log_entry.submission_status = "REPORTED"
                log_entry.reporting_status = "REPORTED"
                log_entry.clearance_status = None
            else:
                log_entry.submission_status = "CLEARED"
                log_entry.clearance_status = "CLEARED"
                log_entry.reporting_status = None

            log_entry.validation_errors = None
            log_entry.response_payload = json.dumps({
                "status": "RETRY_SUCCESS",
                "retry_attempt": log_entry.retry_count,
                "clearance_status": log_entry.clearance_status,
                "reporting_status": log_entry.reporting_status,
                "timestamp": now.isoformat(),
            })

        database.commit()
        database.refresh(log_entry)
        return log_entry
