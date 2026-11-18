from enum import StrEnum

APP_VERSION = "0.1.0"

class Role(StrEnum):
    VIEWER = "viewer"
    OPERATOR = "operator"
    ADMIN = "admin"

class AuditResult(StrEnum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILURE = "failure"
