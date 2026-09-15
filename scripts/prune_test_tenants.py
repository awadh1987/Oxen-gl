# File: scripts/prune_test_tenants.py
import os
import sys
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from sqlalchemy import text

# Initialize project path environment bounds
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database import SessionLocal

# Ensure log directory exists
log_handlers = [logging.StreamHandler(sys.stdout)]
try:
    os.makedirs('/var/log/oxengl', exist_ok=True)
    log_handlers.append(logging.FileHandler('/var/log/oxengl/tenant_prune_cron.log', mode='a'))
except Exception as log_err:
    pass

# Setup execution tracking logger
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] [CRON-PURGE] %(message)s',
    handlers=log_handlers
)
logger = logging.getLogger("tenant_cleaner")

# --- enterprise SMTP infrastructure configuration matrices ---
SMTP_CONFIG = {
    "server": "smtp.oxengl.me",
    "port": 587,
    "user": "operations@oxengl.me",
    "password": "SecureMcpSmtpPasswordToken2026!",
    "from_email": "operations@oxengl.me"
}

def send_expiry_warning_email(manager_email: str, company_name: str, slug: str, deletion_date: str):
    """
    SMTP Relay Interceptor: Transmits a formal operational notice down to 
    trial workspace administrators 3 days prior to an automated database wipe.
    """
    if not manager_email:
        logger.warning(f"Skipping notice dispatch for '{slug}': No administrative email string bound.")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"⚠️ ACTION REQUIRED: Workspace Environment [{slug}] Expiring In 3 Days"
    msg["From"] = SMTP_CONFIG["from_email"]
    msg["To"] = manager_email

    html_payload = f"""
    <html>
      <body style="font-family: sans-serif; background-color: #030712; color: #f1f5f9; padding: 24px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #090f1c; border: 1px solid #1e293b; padding: 32px; border-radius: 16px;">
          <h2 style="color: #f43f5e; font-size: 20px; font-weight: bold; margin-bottom: 4px;">⚠️ Corporate Environment Expiration Notice</h2>
          <p style="color: #94a3b8; font-size: 12px; font-family: monospace; margin-top: 0;">WORKSPACE ISOLATION CONTAINER DECOMMISSIONING</p>
          <hr style="border: 0; border-top: 1px solid #1e293b; my: 16px;" />
          <p style="font-size: 14px; line-height: 1.6;">Dear Operational Administrator,</p>
          <p style="font-size: 14px; line-height: 1.6;">This is an automated system notification that your trial workspace environment node <strong>{company_name}</strong> (<code>{slug}.oxengl.me</code>) is scheduled for permanent cleanup.</p>
          
          <div style="background-color: #030712; border: 1px solid #f43f5e; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 13px; color: #fda4af; margin: 24px 0;">
            <strong>Scheduled Deletion:</strong> {deletion_date} at 00:00 UTC<br/>
            <strong>Scope of Action:</strong> Permanent cascade purge of all ledger nodes, accounting lines, and customs logs.
          </div>
          
          <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">To preserve data or upgrade this sandbox container layout to a permanent cloud lease, please reach out to the platform engineering desk immediately.</p>
          <p style="font-size: 12px; color: #64748b; margin-top: 32px;">OxenGL Monolith Infrastructure Cloud Service • Automations Manager</p>
        </div>
      </body>
    </html>
    """
    msg.attach(MIMEText(html_payload, "html"))

    try:
        with smtplib.SMTP(SMTP_CONFIG["server"], SMTP_CONFIG["port"]) as server:
            server.starttls()
            server.login(SMTP_CONFIG["user"], SMTP_CONFIG["password"])
            server.sendmail(SMTP_CONFIG["from_email"], manager_email, msg.as_string())
        logger.info(f"📬 Expiration warning dispatch sent successfully to manager: {manager_email}")
    except Exception as e:
        logger.error(f"❌ Failed to execute outbound SMTP warning relay handshake: {str(e)}")


def execute_expired_tenant_cleanup(retention_days: int = 14):
    """
    Dual-Track Maintenance Engine: 
    1. Emails notices to trial environments reaching exactly (Retention - 3) days of age.
    2. Atomically purges relational graphs for records that have exceeded the full retention limit.
    """
    logger.info("Initializing automated tenant cleaning and notification pass...")
    db = SessionLocal()
    
    # Calculate precision time windows
    now_utc = datetime.now(timezone.utc)
    warning_target_date = now_utc - timedelta(days=retention_days - 3)
    purge_target_date = now_utc - timedelta(days=retention_days)
    
    try:
        # -----------------------------------------------------------------
        # TRACK 1: THE 3-DAY WARNING ALARM HOOK LOOP
        # -----------------------------------------------------------------
        # Targets records created exactly on the warning threshold date boundary
        warning_candidates = db.execute(
            text("""
                SELECT id, COALESCE(name_en, name) AS name_en, domain_slug, COALESCE(admin_email, '') AS admin_email, created_at 
                FROM res_companies 
                WHERE (domain_slug LIKE '%-test' OR domain_slug LIKE 'test-%' OR name LIKE '%Test%' OR name_en LIKE '%Test%')
                  AND created_at >= :w_start AND created_at < :w_end
            """),
            {
                "w_start": warning_target_date.replace(hour=0, minute=0, second=0, microsecond=0),
                "w_end": warning_target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            }
        ).fetchall()

        for tenant in warning_candidates:
            expected_deletion = (tenant.created_at + timedelta(days=retention_days)).strftime("%Y-%m-%d")
            send_expiry_warning_email(
                manager_email=tenant.admin_email,
                company_name=tenant.name_en,
                slug=tenant.domain_slug,
                deletion_date=expected_deletion
            )

        # -----------------------------------------------------------------
        # TRACK 2: CASCADING TRANSACTIONAL PURGE LOOP
        # -----------------------------------------------------------------
        expired_tenants = db.execute(
            text("""
                SELECT id, COALESCE(name_en, name) AS name_en, domain_slug, created_at 
                FROM res_companies 
                WHERE (domain_slug LIKE '%-test' OR domain_slug LIKE 'test-%' OR name LIKE '%Test%' OR name_en LIKE '%Test%')
                  AND created_at < :threshold
            """),
            {"threshold": purge_target_date}
        ).fetchall()
        
        if not expired_tenants:
            logger.info("Scan finalized: 0 expired trial environments require structural purging tonight.")
            return

        logger.warning(f"Identified {len(expired_tenants)} expired environments flagged for structural purging.")

        for tenant in expired_tenants:
            tenant_id = str(tenant.id)
            logger.info(f"Purging Workspace: {tenant.domain_slug} | ID: {tenant_id}")
            
            # Execute cascading deletions in sequential reverse dependency tracking order
            db.execute(text("DELETE FROM customs_manifests WHERE tenant_id = :tid"), {"tid": tenant_id})
            db.execute(text("DELETE FROM electronic_ledger_blocks WHERE tenant_id = :tid"), {"tid": tenant_id})
            db.execute(text("""
                DELETE FROM journal_lines 
                WHERE account_id IN (SELECT id FROM accounts WHERE tenant_id = :tid)
            """), {"tid": tenant_id})
            db.execute(text("DELETE FROM journal_entries WHERE tenant_id = :tid"), {"tid": tenant_id})
            db.execute(text("DELETE FROM accounts WHERE tenant_id = :tid AND parent_id IS NOT NULL"), {"tid": tenant_id})
            db.execute(text("DELETE FROM accounts WHERE tenant_id = :tid"), {"tid": tenant_id})
            db.execute(text("DELETE FROM res_companies WHERE id = :tid"), {"tid": tenant_id})
            
            logger.info(f"Successfully scrubbed workspace '{tenant.domain_slug}' from server storage blocks.")
        
        db.commit()
        logger.info(f"✅ Maintenance cron pass complete. Purged {len(expired_tenants)} entries.")
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Critical transaction failure encountered during maintenance loop: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    execute_expired_tenant_cleanup(retention_days=14)
