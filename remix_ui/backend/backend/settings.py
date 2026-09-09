import os
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env", override=True)
load_dotenv(PROJECT_ROOT / "backend" / ".env")


@dataclass(frozen=True)
class SystemSettings:
    system_name: str
    company_name: str
    vat_rate: float


def get_system_visual_identity(identity: str | None = None) -> dict[str, str | None]:
    selected_identity = (identity or os.getenv("APP_GLOBAL_IDENTITY", "legacy")).strip().lower()
    if selected_identity == "oxen_blue":
        return {
            "theme_mode": "LIGHT",
            "primary_color": "#1E3A8A",
            "secondary_color": "#10B981",
            "font_family": "Inter, sans-serif",
            "logo_url": None,
        }
    return {
        "theme_mode": os.getenv("APP_DEFAULT_THEME_MODE", "LIGHT"),
        "primary_color": os.getenv("APP_DEFAULT_PRIMARY_COLOR", "#0F172A"),
        "secondary_color": os.getenv("APP_DEFAULT_SECONDARY_COLOR", "#F59E0B"),
        "font_family": os.getenv("APP_DEFAULT_FONT_FAMILY", "Inter, sans-serif"),
        "logo_url": os.getenv("APP_DEFAULT_LOGO_URL", "https://example.com"),
    }


def get_system_settings() -> SystemSettings:
    raw_vat_rate = os.getenv("APP_DEFAULT_VAT_RATE", "0.15")
    try:
        vat_rate = float(Decimal(raw_vat_rate))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("APP_DEFAULT_VAT_RATE must be a valid decimal value") from exc
    if vat_rate < 0:
        raise ValueError("APP_DEFAULT_VAT_RATE cannot be negative")
    return SystemSettings(
        system_name=os.getenv("APP_SYSTEM_NAME", "Onyx-Scale Enterprise ERP Core"),
        company_name=os.getenv("APP_COMPANY_NAME", "Contracting and Logistics Co."),
        vat_rate=vat_rate,
    )


def get_default_vat_rate() -> Decimal:
    return Decimal(str(get_system_settings().vat_rate))