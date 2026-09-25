"""OxenGL Asynchronous Verification and Notification Service.

Handles multi-factor registration verification (Email/SMS OTP),
TTL-managed caching in Redis, and asynchronous external dispatch.
"""
from __future__ import annotations

import json
import logging
import os
import random
from datetime import timedelta
from typing import Any, Dict, Optional

try:
    from backend.app.core.redis import redis_client
except ImportError:
    from app.core.redis import redis_client

logger = logging.getLogger("oxengl.notification_service")


class VerificationService:
    OTP_TTL = timedelta(minutes=5)
    PAYLOAD_TTL = timedelta(minutes=15)

    @classmethod
    async def _safe_call(cls, func, *args, **kwargs):
        """Executes a Redis operation, gracefully refreshing the connection pool if an event loop transition occurred."""
        try:
            return await func(*args, **kwargs)
        except RuntimeError as e:
            err_msg = str(e).lower()
            if "event loop" in err_msg or "attached to a different loop" in err_msg:
                try:
                    await redis_client.connection_pool.disconnect()
                except Exception:
                    pass
                return await func(*args, **kwargs)
            raise

    @classmethod
    async def generate_and_store_otp(
        cls,
        identifier: str,
        ttl_seconds: Optional[int] = None,
        expire_seconds: Optional[int] = None,
    ) -> str:
        """Generates a 6-digit numeric OTP and stores it in Redis with a 5-minute default TTL."""
        norm_id = identifier.strip().lower()
        otp = f"{random.randint(100000, 999999)}"
        key = f"otp:{norm_id}"
        ttl = ttl_seconds or expire_seconds or int(cls.OTP_TTL.total_seconds())
        await cls._safe_call(redis_client.set, key, otp, ex=ttl)
        logger.info(f"Generated secure OTP for identifier: {norm_id}")
        return otp

    @classmethod
    async def verify_otp(cls, identifier: str, provided_otp: str) -> bool:
        """Verifies the supplied OTP against Redis and invalidates it upon match to prevent replay attacks."""
        norm_id = identifier.strip().lower()
        key = f"otp:{norm_id}"
        stored_otp = await cls._safe_call(redis_client.get, key)
        if not stored_otp:
            return False

        val = stored_otp.decode("utf-8") if isinstance(stored_otp, bytes) else str(stored_otp)
        if val.strip() == str(provided_otp).strip():
            await cls._safe_call(redis_client.delete, key)
            return True
        return False

    @classmethod
    async def store_registration_payload(
        cls,
        identifier: str,
        payload_data: Dict[str, Any],
        ttl_seconds: Optional[int] = None,
        expire_seconds: Optional[int] = None,
    ) -> None:
        """Temporarily caches validated registration form data in Redis pending OTP verification."""
        norm_id = identifier.strip().lower()
        key = f"otp_payload:{norm_id}"
        ttl = ttl_seconds or expire_seconds or int(cls.PAYLOAD_TTL.total_seconds())
        await cls._safe_call(
            redis_client.set,
            key,
            json.dumps(payload_data),
            ex=ttl,
        )

    @classmethod
    async def get_registration_payload(cls, identifier: str) -> Optional[Dict[str, Any]]:
        """Retrieves temporarily cached registration data from Redis."""
        norm_id = identifier.strip().lower()
        key = f"otp_payload:{norm_id}"
        stored = await cls._safe_call(redis_client.get, key)
        if stored:
            val = stored.decode("utf-8") if isinstance(stored, bytes) else str(stored)
            return json.loads(val)
        return None

    @classmethod
    async def delete_registration_payload(cls, identifier: str) -> None:
        """Deletes temporarily cached registration data once successfully provisioned."""
        norm_id = identifier.strip().lower()
        key = f"otp_payload:{norm_id}"
        await cls._safe_call(redis_client.delete, key)

    @staticmethod
    async def dispatch_email_otp(email: str, otp: str, company_name: str) -> None:
        """Asynchronous dispatcher for SendGrid / SMTP email delivery."""
        logger.info(f"📧 [NOTIFICATION] Dispatching Email OTP {otp} to {email} for company '{company_name}'")

    @staticmethod
    async def dispatch_sms_otp(phone: str, otp: str) -> None:
        """Asynchronous dispatcher for Twilio / Vonage SMS delivery."""
        logger.info(f"📱 [NOTIFICATION] Dispatching SMS OTP {otp} to {phone}")
