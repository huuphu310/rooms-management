# Security Architecture

## Executive Summary

The Room Booking System implements a comprehensive, multi-layered security architecture following industry best practices and compliance standards to protect sensitive data, ensure system integrity, and maintain user privacy.

## Security Principles

### Defense in Depth
Multiple layers of security controls to protect against various threat vectors:
1. Network Security
2. Application Security
3. Data Security
4. Identity & Access Management
5. Monitoring & Incident Response

### Zero Trust Architecture
- Never trust, always verify
- Least privilege access
- Continuous validation
- Assume breach mentality

### Security by Design
- Security integrated from inception
- Privacy by default
- Secure defaults
- Regular security assessments

## Threat Model

### Assets to Protect
1. **Customer Data**
   - Personal information (PII)
   - Payment card data (PCI)
   - Booking history
   - Contact information

2. **Business Data**
   - Financial records
   - Operational data
   - Pricing strategies
   - Internal communications

3. **System Resources**
   - Application servers
   - Database servers
   - API endpoints
   - Admin interfaces

### Threat Actors
1. **External Attackers**
   - Hackers/Cybercriminals
   - Competitors
   - State-sponsored actors

2. **Internal Threats**
   - Malicious insiders
   - Compromised accounts
   - Accidental exposure

3. **Automated Threats**
   - Bots
   - Scrapers
   - DDoS attacks

### Attack Vectors
```
┌─────────────────────────────────────────┐
│           Potential Attack Vectors       │
├─────────────────────────────────────────┤
│  • SQL Injection                        │
│  • Cross-Site Scripting (XSS)          │
│  • Cross-Site Request Forgery (CSRF)   │
│  • Authentication Bypass               │
│  • Session Hijacking                   │
│  • API Abuse                          │
│  • DDoS Attacks                       │
│  • Data Breaches                      │
│  • Malware/Ransomware                 │
│  • Social Engineering                 │
└─────────────────────────────────────────┘
```

## Security Architecture Layers

### 1. Network Security

#### Network Segmentation
```
┌──────────────────────────────────────────────┐
│              Internet (Public)                │
└────────────────┬─────────────────────────────┘
                 │
        ┌────────▼────────┐
        │   WAF/CDN       │ ← DDoS Protection
        │  (Cloudflare)   │ ← Rate Limiting
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │  Load Balancer  │ ← SSL Termination
        └────────┬────────┘
                 │
   ┌─────────────┼─────────────┐
   │             │             │
┌──▼───┐    ┌───▼───┐    ┌───▼───┐
│ DMZ  │    │  App  │    │  App  │ ← Application Tier
│Proxy │    │Server1│    │Server2│
└──┬───┘    └───┬───┘    └───┬───┘
   │            │             │
   └────────────┼─────────────┘
                │
        ┌───────▼────────┐
        │   Database     │ ← Data Tier
        │   (Private)    │
        └────────────────┘
```

#### Firewall Rules
```yaml
# Ingress Rules
- rule: allow_https
  port: 443
  protocol: tcp
  source: 0.0.0.0/0
  
- rule: allow_ssh_bastion
  port: 22
  protocol: tcp
  source: bastion_host_ip

# Egress Rules  
- rule: allow_database
  port: 5432
  protocol: tcp
  destination: database_subnet

- rule: deny_all
  action: deny
  source: 0.0.0.0/0
```

#### VPN Configuration
```python
# Site-to-site VPN for admin access
vpn_config = {
    "type": "IPSec",
    "encryption": "AES-256",
    "hash": "SHA-256",
    "dh_group": 14,
    "lifetime": 3600
}
```

### 2. Application Security

#### Authentication System

##### Multi-Factor Authentication (MFA)
```python
from pyotp import TOTP
import qrcode

class MFAService:
    def generate_secret(self, user_id: str) -> str:
        """Generate TOTP secret for user"""
        secret = pyotp.random_base32()
        # Store encrypted secret
        self.store_secret(user_id, self.encrypt(secret))
        return secret
    
    def generate_qr_code(self, user_email: str, secret: str) -> str:
        """Generate QR code for authenticator app"""
        uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user_email,
            issuer_name='Room Booking System'
        )
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)
        return qr.make_image(fill_color="black", back_color="white")
    
    def verify_token(self, user_id: str, token: str) -> bool:
        """Verify TOTP token"""
        secret = self.decrypt(self.get_secret(user_id))
        totp = TOTP(secret)
        return totp.verify(token, valid_window=1)
```

##### Password Policy
```python
from passlib.context import CryptContext
import re

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

class PasswordPolicy:
    MIN_LENGTH = 12
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_NUMBERS = True
    REQUIRE_SPECIAL = True
    
    @classmethod
    def validate(cls, password: str) -> tuple[bool, list[str]]:
        errors = []
        
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters")
        
        if cls.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("Password must contain uppercase letters")
        
        if cls.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("Password must contain lowercase letters")
        
        if cls.REQUIRE_NUMBERS and not re.search(r'\d', password):
            errors.append("Password must contain numbers")
        
        if cls.REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain special characters")
        
        # Check against common passwords
        if password.lower() in COMMON_PASSWORDS:
            errors.append("Password is too common")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
```

##### Session Management
```python
import secrets
from datetime import datetime, timedelta

class SessionManager:
    SESSION_TIMEOUT = timedelta(minutes=30)
    ABSOLUTE_TIMEOUT = timedelta(hours=8)
    
    def create_session(self, user_id: str) -> dict:
        session = {
            "session_id": secrets.token_urlsafe(32),
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            "last_activity": datetime.utcnow(),
            "ip_address": get_client_ip(),
            "user_agent": get_user_agent()
        }
        self.store_session(session)
        return session
    
    def validate_session(self, session_id: str) -> bool:
        session = self.get_session(session_id)
        
        if not session:
            return False
        
        # Check absolute timeout
        if datetime.utcnow() - session["created_at"] > self.ABSOLUTE_TIMEOUT:
            self.invalidate_session(session_id)
            return False
        
        # Check idle timeout
        if datetime.utcnow() - session["last_activity"] > self.SESSION_TIMEOUT:
            self.invalidate_session(session_id)
            return False
        
        # Validate IP and user agent
        if session["ip_address"] != get_client_ip():
            self.log_security_event("IP_MISMATCH", session_id)
            return False
        
        # Update last activity
        session["last_activity"] = datetime.utcnow()
        self.update_session(session)
        
        return True
```

#### Authorization System

##### Role-Based Access Control (RBAC)
```python
from enum import Enum
from typing import Set

class Permission(Enum):
    # Booking permissions
    BOOKING_VIEW = "booking:view"
    BOOKING_CREATE = "booking:create"
    BOOKING_UPDATE = "booking:update"
    BOOKING_DELETE = "booking:delete"
    
    # Room permissions
    ROOM_VIEW = "room:view"
    ROOM_CREATE = "room:create"
    ROOM_UPDATE = "room:update"
    ROOM_DELETE = "room:delete"
    
    # Financial permissions
    INVOICE_VIEW = "invoice:view"
    INVOICE_CREATE = "invoice:create"
    PAYMENT_PROCESS = "payment:process"
    REFUND_PROCESS = "refund:process"
    
    # Admin permissions
    USER_MANAGE = "user:manage"
    SYSTEM_CONFIG = "system:config"
    AUDIT_VIEW = "audit:view"

class Role:
    def __init__(self, name: str, permissions: Set[Permission]):
        self.name = name
        self.permissions = permissions

# Define roles
ROLES = {
    "guest": Role("guest", {
        Permission.BOOKING_VIEW,
        Permission.ROOM_VIEW
    }),
    
    "receptionist": Role("receptionist", {
        Permission.BOOKING_VIEW,
        Permission.BOOKING_CREATE,
        Permission.BOOKING_UPDATE,
        Permission.ROOM_VIEW,
        Permission.ROOM_UPDATE,
        Permission.INVOICE_VIEW,
        Permission.PAYMENT_PROCESS
    }),
    
    "manager": Role("manager", {
        # All receptionist permissions plus...
        Permission.BOOKING_DELETE,
        Permission.ROOM_CREATE,
        Permission.ROOM_DELETE,
        Permission.INVOICE_CREATE,
        Permission.REFUND_PROCESS,
        Permission.AUDIT_VIEW
    }),
    
    "admin": Role("admin", {
        # All permissions
        *Permission
    })
}

def check_permission(user_role: str, required_permission: Permission) -> bool:
    role = ROLES.get(user_role)
    if not role:
        return False
    return required_permission in role.permissions
```

##### Attribute-Based Access Control (ABAC)
```python
class ABACPolicy:
    """
    Advanced access control based on attributes
    """
    
    def can_access_booking(self, user: dict, booking: dict) -> bool:
        # Admin can access all
        if user["role"] == "admin":
            return True
        
        # Customer can access own bookings
        if user["id"] == booking["customer_id"]:
            return True
        
        # Staff can access based on department
        if user["role"] in ["receptionist", "manager"]:
            if booking["property_id"] == user["property_id"]:
                return True
        
        return False
    
    def can_modify_price(self, user: dict, amount_change: float) -> bool:
        # Check role-based limits
        limits = {
            "receptionist": 100,
            "manager": 1000,
            "admin": float('inf')
        }
        
        user_limit = limits.get(user["role"], 0)
        return abs(amount_change) <= user_limit
```

### 3. Data Security

#### Encryption at Rest
```python
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2

class DataEncryption:
    def __init__(self, master_key: str):
        # Derive encryption key from master key
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'stable_salt',  # Use proper salt management
            iterations=100000
        )
        key = base64.urlsafe_b64encode(kdf.derive(master_key.encode()))
        self.cipher = Fernet(key)
    
    def encrypt_pii(self, data: str) -> str:
        """Encrypt personally identifiable information"""
        return self.cipher.encrypt(data.encode()).decode()
    
    def decrypt_pii(self, encrypted_data: str) -> str:
        """Decrypt personally identifiable information"""
        return self.cipher.decrypt(encrypted_data.encode()).decode()
    
    def encrypt_credit_card(self, card_number: str) -> dict:
        """Tokenize and encrypt credit card data"""
        # Store only last 4 digits in plain text
        last_four = card_number[-4:]
        
        # Encrypt full number
        encrypted = self.encrypt_pii(card_number)
        
        # Generate token for references
        token = secrets.token_urlsafe(32)
        
        return {
            "token": token,
            "encrypted_number": encrypted,
            "last_four": last_four
        }
```

#### Encryption in Transit
```yaml
# TLS Configuration
tls:
  minimum_version: "1.2"
  preferred_version: "1.3"
  cipher_suites:
    - TLS_AES_256_GCM_SHA384
    - TLS_AES_128_GCM_SHA256
    - TLS_CHACHA20_POLY1305_SHA256
  certificate:
    type: "RSA"
    key_size: 2048
    signature_algorithm: "SHA256"
```

#### Data Masking
```python
class DataMasking:
    @staticmethod
    def mask_email(email: str) -> str:
        """Mask email address"""
        parts = email.split('@')
        if len(parts) != 2:
            return "***"
        
        username = parts[0]
        domain = parts[1]
        
        if len(username) <= 2:
            masked_username = "*" * len(username)
        else:
            masked_username = username[0] + "*" * (len(username) - 2) + username[-1]
        
        return f"{masked_username}@{domain}"
    
    @staticmethod
    def mask_phone(phone: str) -> str:
        """Mask phone number"""
        if len(phone) < 4:
            return "*" * len(phone)
        return "*" * (len(phone) - 4) + phone[-4:]
    
    @staticmethod
    def mask_credit_card(card: str) -> str:
        """Mask credit card number"""
        if len(card) < 4:
            return "*" * len(card)
        return "*" * (len(card) - 4) + card[-4:]
```

### 4. API Security

#### API Rate Limiting
```python
from datetime import datetime, timedelta
import redis

class RateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.limits = {
            "default": {"requests": 100, "window": 60},  # 100 req/min
            "auth": {"requests": 5, "window": 300},       # 5 req/5min
            "payment": {"requests": 10, "window": 60},    # 10 req/min
            "admin": {"requests": 1000, "window": 60}     # 1000 req/min
        }
    
    def check_rate_limit(self, 
                        client_id: str, 
                        endpoint_type: str = "default") -> tuple[bool, dict]:
        limit_config = self.limits.get(endpoint_type, self.limits["default"])
        key = f"rate_limit:{endpoint_type}:{client_id}"
        
        try:
            current_count = self.redis.incr(key)
            
            if current_count == 1:
                self.redis.expire(key, limit_config["window"])
            
            ttl = self.redis.ttl(key)
            
            if current_count > limit_config["requests"]:
                return False, {
                    "allowed": False,
                    "limit": limit_config["requests"],
                    "remaining": 0,
                    "reset_in": ttl
                }
            
            return True, {
                "allowed": True,
                "limit": limit_config["requests"],
                "remaining": limit_config["requests"] - current_count,
                "reset_in": ttl
            }
        except Exception as e:
            # Fail open on Redis errors
            self.log_error(f"Rate limit check failed: {e}")
            return True, {"allowed": True, "error": "rate_limit_check_failed"}
```

#### API Authentication
```python
import jwt
from datetime import datetime, timedelta

class JWTManager:
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.access_token_expire = timedelta(minutes=15)
        self.refresh_token_expire = timedelta(days=7)
    
    def create_access_token(self, user_data: dict) -> str:
        payload = {
            "sub": user_data["id"],
            "email": user_data["email"],
            "role": user_data["role"],
            "type": "access",
            "exp": datetime.utcnow() + self.access_token_expire,
            "iat": datetime.utcnow(),
            "jti": secrets.token_urlsafe(16)  # JWT ID for revocation
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, user_id: str) -> str:
        payload = {
            "sub": user_id,
            "type": "refresh",
            "exp": datetime.utcnow() + self.refresh_token_expire,
            "iat": datetime.utcnow(),
            "jti": secrets.token_urlsafe(16)
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str, token_type: str = "access") -> dict:
        try:
            payload = jwt.decode(
                token, 
                self.secret_key, 
                algorithms=[self.algorithm]
            )
            
            if payload.get("type") != token_type:
                raise jwt.InvalidTokenError("Invalid token type")
            
            # Check if token is revoked
            if self.is_token_revoked(payload.get("jti")):
                raise jwt.InvalidTokenError("Token has been revoked")
            
            return payload
        except jwt.ExpiredSignatureError:
            raise Exception("Token has expired")
        except jwt.InvalidTokenError as e:
            raise Exception(f"Invalid token: {str(e)}")
```

### 5. Security Monitoring

#### Audit Logging
```python
import json
from datetime import datetime

class AuditLogger:
    def __init__(self, storage_backend):
        self.storage = storage_backend
    
    def log_event(self, event_type: str, **kwargs):
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "user_id": kwargs.get("user_id"),
            "ip_address": kwargs.get("ip_address"),
            "user_agent": kwargs.get("user_agent"),
            "resource": kwargs.get("resource"),
            "action": kwargs.get("action"),
            "result": kwargs.get("result"),
            "details": kwargs.get("details", {})
        }
        
        # Log to storage
        self.storage.store(event)
        
        # Alert on suspicious events
        if self.is_suspicious(event):
            self.send_alert(event)
    
    def is_suspicious(self, event: dict) -> bool:
        suspicious_patterns = [
            "multiple_failed_logins",
            "privilege_escalation_attempt",
            "sql_injection_attempt",
            "unauthorized_access",
            "data_exfiltration_attempt"
        ]
        return event["event_type"] in suspicious_patterns
    
    def send_alert(self, event: dict):
        # Send to SIEM or alert system
        pass
```

#### Intrusion Detection
```python
class IntrusionDetectionSystem:
    def __init__(self):
        self.patterns = self.load_attack_patterns()
        self.threshold_config = {
            "failed_login_attempts": 5,
            "api_requests_per_minute": 100,
            "unique_ips_per_user": 3
        }
    
    def analyze_request(self, request: dict) -> dict:
        threats = []
        
        # Check for SQL injection
        if self.detect_sql_injection(request):
            threats.append({
                "type": "SQL_INJECTION",
                "severity": "HIGH",
                "action": "BLOCK"
            })
        
        # Check for XSS
        if self.detect_xss(request):
            threats.append({
                "type": "XSS",
                "severity": "MEDIUM",
                "action": "SANITIZE"
            })
        
        # Check for path traversal
        if self.detect_path_traversal(request):
            threats.append({
                "type": "PATH_TRAVERSAL",
                "severity": "HIGH",
                "action": "BLOCK"
            })
        
        # Check rate limits
        if self.detect_rate_limit_abuse(request):
            threats.append({
                "type": "RATE_LIMIT_ABUSE",
                "severity": "LOW",
                "action": "THROTTLE"
            })
        
        return {
            "request_id": request.get("id"),
            "threats": threats,
            "risk_score": self.calculate_risk_score(threats),
            "recommended_action": self.get_recommended_action(threats)
        }
    
    def detect_sql_injection(self, request: dict) -> bool:
        sql_patterns = [
            r"(\%27)|(\')|(\-\-)|(\%23)|(#)",
            r"((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))",
            r"\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))",
            r"((\%27)|(\'))union",
            r"exec(\s|\+)+(s|x)p\w+"
        ]
        
        data_to_check = json.dumps(request.get("body", {}))
        data_to_check += request.get("query_string", "")
        
        for pattern in sql_patterns:
            if re.search(pattern, data_to_check, re.IGNORECASE):
                return True
        return False
```

## Compliance & Standards

### PCI DSS Compliance
```python
class PCICompliance:
    """
    Payment Card Industry Data Security Standard compliance
    """
    
    def __init__(self):
        self.requirements = {
            "1": "Install and maintain firewall configuration",
            "2": "Do not use vendor-supplied defaults",
            "3": "Protect stored cardholder data",
            "4": "Encrypt transmission of cardholder data",
            "5": "Use and regularly update anti-virus software",
            "6": "Develop and maintain secure systems",
            "7": "Restrict access by business need-to-know",
            "8": "Assign unique ID to each person with access",
            "9": "Restrict physical access to cardholder data",
            "10": "Track and monitor all access",
            "11": "Regularly test security systems",
            "12": "Maintain information security policy"
        }
    
    def validate_card_storage(self, storage_method: dict) -> bool:
        """Validate PCI-compliant card storage"""
        # Never store CVV
        if storage_method.get("stores_cvv"):
            return False
        
        # Card number must be encrypted
        if not storage_method.get("encryption_enabled"):
            return False
        
        # Use strong encryption
        if storage_method.get("encryption_algorithm") not in ["AES-256", "RSA-2048"]:
            return False
        
        return True
```

### GDPR Compliance
```python
class GDPRCompliance:
    """
    General Data Protection Regulation compliance
    """
    
    def __init__(self):
        self.lawful_bases = [
            "consent",
            "contract",
            "legal_obligation",
            "vital_interests",
            "public_task",
            "legitimate_interests"
        ]
    
    def handle_data_request(self, request_type: str, user_id: str) -> dict:
        """Handle GDPR data subject requests"""
        
        if request_type == "access":
            # Right to access personal data
            return self.export_user_data(user_id)
        
        elif request_type == "rectification":
            # Right to rectification
            return self.update_user_data(user_id)
        
        elif request_type == "erasure":
            # Right to be forgotten
            return self.delete_user_data(user_id)
        
        elif request_type == "portability":
            # Right to data portability
            return self.export_user_data_portable(user_id)
        
        elif request_type == "restriction":
            # Right to restrict processing
            return self.restrict_processing(user_id)
        
        elif request_type == "objection":
            # Right to object
            return self.handle_objection(user_id)
```

## Incident Response Plan

### Incident Classification
```python
class IncidentClassification:
    SEVERITY_LEVELS = {
        "CRITICAL": {
            "description": "Data breach, system compromise",
            "response_time": "15 minutes",
            "escalation": "immediate"
        },
        "HIGH": {
            "description": "Attempted breach, service disruption",
            "response_time": "1 hour",
            "escalation": "within 2 hours"
        },
        "MEDIUM": {
            "description": "Policy violation, suspicious activity",
            "response_time": "4 hours",
            "escalation": "within 24 hours"
        },
        "LOW": {
            "description": "Minor security event",
            "response_time": "24 hours",
            "escalation": "as needed"
        }
    }
```

### Response Procedures
```python
class IncidentResponse:
    def __init__(self):
        self.response_team = {
            "incident_commander": "security@company.com",
            "technical_lead": "tech@company.com",
            "communications": "pr@company.com",
            "legal": "legal@company.com"
        }
    
    async def handle_incident(self, incident: dict):
        # 1. Detection and Analysis
        severity = self.classify_incident(incident)
        
        # 2. Containment
        await self.contain_threat(incident)
        
        # 3. Eradication
        await self.remove_threat(incident)
        
        # 4. Recovery
        await self.restore_services(incident)
        
        # 5. Post-Incident
        await self.document_lessons_learned(incident)
        
        # 6. Notification
        if severity in ["CRITICAL", "HIGH"]:
            await self.notify_stakeholders(incident)
```

## Security Testing

### Penetration Testing
```bash
# Regular penetration testing schedule
- Quarterly: External penetration testing
- Semi-annual: Internal penetration testing
- Annual: Red team exercises
- Continuous: Automated vulnerability scanning
```

### Security Scanning
```python
# Automated security scanning integration
class SecurityScanning:
    def __init__(self):
        self.scanners = {
            "sast": "SonarQube",  # Static Application Security Testing
            "dast": "OWASP ZAP",  # Dynamic Application Security Testing
            "dependency": "Snyk",  # Dependency vulnerability scanning
            "container": "Trivy",  # Container scanning
            "infrastructure": "Terraform Sentinel"  # IaC scanning
        }
    
    def run_security_pipeline(self):
        results = {}
        
        # Run each scanner
        for scan_type, scanner in self.scanners.items():
            results[scan_type] = self.run_scan(scanner)
        
        # Aggregate results
        vulnerabilities = self.aggregate_vulnerabilities(results)
        
        # Block deployment if critical vulnerabilities found
        if self.has_critical_vulnerabilities(vulnerabilities):
            raise SecurityException("Critical vulnerabilities detected")
        
        return results
```

## Conclusion

This comprehensive security architecture provides:
- **Multi-layered protection** against various threat vectors
- **Compliance** with industry standards (PCI DSS, GDPR)
- **Continuous monitoring** and threat detection
- **Incident response** capabilities
- **Regular testing** and validation

The security measures are designed to evolve with emerging threats while maintaining usability and performance.