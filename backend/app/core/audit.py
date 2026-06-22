from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_action(
    db: Session,
    user_email: str,
    action: str,
    entity_type: str,
    entity_id,
    old_value=None,
    new_value=None,
):
    audit_log = AuditLog(
        user_email=user_email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=old_value,
        new_value=new_value,
    )

    db.add(audit_log)

    return audit_log