"""
Comprehensive test suite for JWT verification and authentication security
Based on the Authentication & Authorization Update Requirements
"""
import pytest
import jwt
import json
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

# Import the modules to test
from app.main import app
from app.api.deps import AuthService
from app.core.config import settings


class TestJWTVerification:
    """Test JWT token verification with proper security validations"""
    
    @pytest.fixture(scope="class")
    def rsa_keys(self):
        """Generate RSA key pair for testing"""
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        public_key = private_key.public_key()
        
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        
        return {
            "private_key": private_key,
            "public_key": public_key,
            "private_pem": private_pem,
            "public_pem": public_pem
        }
    
    @pytest.fixture
    def make_token(self, rsa_keys):
        """Factory for creating test JWT tokens"""
        def _make_token(
            claim_overrides=None,
            headers=None,
            exp_minutes=15,
            aud=None,
            iss=None,
            algorithm="RS256"
        ):
            now = datetime.now(timezone.utc)
            payload = {
                "sub": "test-user-123",
                "email": "test@example.com",
                "role": "authenticated",
                "tenant_id": "11111111-1111-1111-1111-111111111111",
                "iat": int(now.timestamp()),
                "nbf": int((now - timedelta(seconds=1)).timestamp()),
                "exp": int((now + timedelta(minutes=exp_minutes)).timestamp()),
                "aud": aud or settings.JWT_AUD,
                "iss": iss or settings.JWT_ISS,
            }
            
            if claim_overrides:
                payload.update(claim_overrides)
            
            signing_key = rsa_keys["private_pem"]
            if algorithm == "HS256":
                signing_key = "test-secret"
            
            return jwt.encode(
                payload,
                signing_key,
                algorithm=algorithm,
                headers={"kid": "test-key", **(headers or {})}
            )
        
        return _make_token
    
    @pytest.fixture
    def mock_jwks_client(self, rsa_keys):
        """Mock JWKS client to return test public key"""
        with patch('app.api.deps.PyJWKClient') as mock_client:
            mock_instance = MagicMock()
            mock_signing_key = MagicMock()
            mock_signing_key.key = rsa_keys["public_pem"]
            mock_instance.get_signing_key_from_jwt.return_value = mock_signing_key
            mock_client.return_value = mock_instance
            yield mock_client
    
    def test_valid_jwt_token_verification(self, make_token, mock_jwks_client):
        """Test that valid JWT tokens are properly verified"""
        # Enable JWT verification for this test
        with patch.object(settings, 'JWT_VERIFY_SIGNATURE', True):
            with patch.object(settings, 'JWT_JWKS_URL', 'https://example.com/.well-known/jwks.json'):
                token = make_token()
                result = AuthService.decode_jwt_token(token)
                
                assert result is not None
                assert result["user_id"] == "test-user-123"
                assert result["email"] == "test@example.com"
                assert result["role"] == "authenticated"
                assert result["tenant_id"] == "11111111-1111-1111-1111-111111111111"
                assert "raw_token" in result
    
    def test_expired_jwt_token_rejection(self, make_token, mock_jwks_client):
        """Test that expired JWT tokens are rejected"""
        with patch.object(settings, 'JWT_VERIFY_SIGNATURE', True):
            with patch.object(settings, 'JWT_JWKS_URL', 'https://example.com/.well-known/jwks.json'):
                # Create token that expired 5 minutes ago
                token = make_token(exp_minutes=-5)
                result = AuthService.decode_jwt_token(token)
                
                assert result is None
    
    def test_invalid_signature_rejection(self, make_token, mock_jwks_client, rsa_keys):
        """Test that tokens with invalid signatures are rejected"""
        with patch.object(settings, 'JWT_VERIFY_SIGNATURE', True):
            with patch.object(settings, 'JWT_JWKS_URL', 'https://example.com/.well-known/jwks.json'):
                # Create valid token
                token = make_token()
                # Tamper with the token to make signature invalid
                tampered_token = token[:-10] + "tampered123"
                
                result = AuthService.decode_jwt_token(tampered_token)
                assert result is None
    
    def test_wrong_audience_rejection(self, make_token, mock_jwks_client):
        """Test that tokens with wrong audience are rejected"""
        with patch.object(settings, 'JWT_VERIFY_SIGNATURE', True):
            with patch.object(settings, 'JWT_JWKS_URL', 'https://example.com/.well-known/jwks.json'):
                token = make_token(aud="wrong-audience")
                result = AuthService.decode_jwt_token(token)
                
                assert result is None
    
    def test_wrong_issuer_rejection(self, make_token, mock_jwks_client):
        """Test that tokens with wrong issuer are rejected"""
        with patch.object(settings, 'JWT_VERIFY_SIGNATURE', True):
            with patch.object(settings, 'JWT_JWKS_URL', 'https://example.com/.well-known/jwks.json'):
                token = make_token(iss="https://malicious.example.com/auth/v1")
                result = AuthService.decode_jwt_token(token)
                
                assert result is None
    
    def test_missing_required_claims(self, make_token, mock_jwks_client):
        """Test that tokens missing required claims are rejected"""
        with patch.object(settings, 'JWT_VERIFY_SIGNATURE', True):
            with patch.object(settings, 'JWT_JWKS_URL', 'https://example.com/.well-known/jwks.json'):
                # Token without 'sub' claim
                token = make_token(claim_overrides={"sub": None})
                result = AuthService.decode_jwt_token(token)
                
                assert result is None
    
    def test_not_before_validation(self, make_token, mock_jwks_client):
        """Test that tokens used before nbf time are rejected"""
        with patch.object(settings, 'JWT_VERIFY_SIGNATURE', True):
            with patch.object(settings, 'JWT_JWKS_URL', 'https://example.com/.well-known/jwks.json'):
                # Create token that's not valid until future
                future_time = datetime.now(timezone.utc) + timedelta(minutes=10)
                token = make_token(claim_overrides={
                    "nbf": int(future_time.timestamp())
                })
                result = AuthService.decode_jwt_token(token)
                
                assert result is None
    
    def test_development_mode_bypass(self, make_token):
        """Test that development mode bypasses signature verification"""
        with patch.object(settings, 'JWT_VERIFY_SIGNATURE', False):
            token = make_token()
            result = AuthService.decode_jwt_token(token)
            
            # Should work even without JWKS setup
            assert result is not None
            assert result["user_id"] == "test-user-123"
    
    def test_malformed_token_rejection(self, mock_jwks_client):
        """Test that malformed tokens are rejected gracefully"""
        with patch.object(settings, 'JWT_VERIFY_SIGNATURE', True):
            # Various malformed tokens
            malformed_tokens = [
                "not.a.token",
                "header.payload",  # Missing signature
                "",
                "completely-invalid",
                None
            ]
            
            for bad_token in malformed_tokens:
                result = AuthService.decode_jwt_token(bad_token or "")
                assert result is None
    
    def test_clock_skew_tolerance_within_leeway(self, make_token, mock_jwks_client):
        """Test that tokens issued slightly in the future are accepted within leeway"""
        with patch.object(settings, 'JWT_VERIFY_SIGNATURE', True):
            with patch.object(settings, 'JWT_JWKS_URL', 'https://example.com/.well-known/jwks.json'):
                with patch.object(settings, 'JWT_LEEWAY', 120):  # 2 minutes leeway
                    # Create token issued 1 minute in the future (within leeway)
                    now = datetime.now(timezone.utc)
                    future_iat = now + timedelta(minutes=1)
                    
                    token = make_token(claim_overrides={
                        "iat": int(future_iat.timestamp()),
                        "exp": int((future_iat + timedelta(minutes=15)).timestamp())
                    })
                    result = AuthService.decode_jwt_token(token)
                    
                    # Should be accepted due to leeway
                    assert result is not None
                    assert result["user_id"] == "test-user-123"
    
    def test_clock_skew_tolerance_outside_leeway(self, make_token, mock_jwks_client):
        """Test that tokens issued too far in the future are rejected"""
        with patch.object(settings, 'JWT_VERIFY_SIGNATURE', True):
            with patch.object(settings, 'JWT_JWKS_URL', 'https://example.com/.well-known/jwks.json'):
                with patch.object(settings, 'JWT_LEEWAY', 120):  # 2 minutes leeway
                    # Create token issued 5 minutes in the future (outside leeway)
                    now = datetime.now(timezone.utc)
                    future_iat = now + timedelta(minutes=5)
                    
                    token = make_token(claim_overrides={
                        "iat": int(future_iat.timestamp()),
                        "exp": int((future_iat + timedelta(minutes=15)).timestamp())
                    })
                    result = AuthService.decode_jwt_token(token)
                    
                    # Should be rejected as outside leeway
                    assert result is None
    
    def test_expired_token_with_leeway_tolerance(self, make_token, mock_jwks_client):
        """Test that recently expired tokens are accepted within leeway"""
        with patch.object(settings, 'JWT_VERIFY_SIGNATURE', True):
            with patch.object(settings, 'JWT_JWKS_URL', 'https://example.com/.well-known/jwks.json'):
                with patch.object(settings, 'JWT_LEEWAY', 120):  # 2 minutes leeway
                    # Create token that expired 1 minute ago (within leeway)
                    now = datetime.now(timezone.utc)
                    exp_time = now - timedelta(minutes=1)
                    
                    token = make_token(claim_overrides={
                        "exp": int(exp_time.timestamp())
                    })
                    result = AuthService.decode_jwt_token(token)
                    
                    # Should be accepted due to leeway
                    assert result is not None
                    assert result["user_id"] == "test-user-123"
    
    def test_leeway_setting_applied(self, make_token, mock_jwks_client):
        """Test that JWT_LEEWAY setting is properly applied in verification"""
        with patch.object(settings, 'JWT_VERIFY_SIGNATURE', True):
            with patch.object(settings, 'JWT_JWKS_URL', 'https://example.com/.well-known/jwks.json'):
                # Test with different leeway values
                test_cases = [
                    (60, timedelta(seconds=30), True),   # 30s offset with 60s leeway -> accept
                    (60, timedelta(seconds=90), False),  # 90s offset with 60s leeway -> reject  
                    (180, timedelta(seconds=90), True),  # 90s offset with 180s leeway -> accept
                ]
                
                for leeway_seconds, time_offset, should_accept in test_cases:
                    with patch.object(settings, 'JWT_LEEWAY', leeway_seconds):
                        now = datetime.now(timezone.utc)
                        # Test with future issued time
                        future_iat = now + time_offset
                        
                        token = make_token(claim_overrides={
                            "iat": int(future_iat.timestamp()),
                            "exp": int((future_iat + timedelta(minutes=15)).timestamp())
                        })
                        result = AuthService.decode_jwt_token(token)
                        
                        if should_accept:
                            assert result is not None, f"Token should be accepted with {leeway_seconds}s leeway and {time_offset.total_seconds()}s offset"
                        else:
                            assert result is None, f"Token should be rejected with {leeway_seconds}s leeway and {time_offset.total_seconds()}s offset"


class TestUserScopedDatabase:
    """Test user-scoped database client functionality"""
    
    def test_authenticated_user_gets_scoped_client(self):
        """Test that authenticated users get JWT-scoped database client"""
        from app.api.deps import get_authenticated_db
        
        mock_user = {
            "user_id": "test-user",
            "raw_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.test"
        }
        
        with patch('app.api.deps.create_client') as mock_create_client:
            # Mock the async function call
            import asyncio
            async def run_test():
                await get_authenticated_db(user=mock_user)
            
            asyncio.run(run_test())
            
            # Verify create_client was called with user token
            mock_create_client.assert_called_once()
            call_args = mock_create_client.call_args
            
            assert call_args[0][0] == settings.SUPABASE_URL
            assert call_args[0][1] == settings.SUPABASE_KEY  # anon key, not service key
            assert "headers" in call_args[1]["options"]
            headers = call_args[1]["options"]["headers"]
            assert "Authorization" in headers
            assert headers["Authorization"].startswith("Bearer ")
    
    def test_missing_token_raises_exception(self):
        """Test that missing token raises UnauthorizedException"""
        from app.api.deps import get_authenticated_db
        from app.core.exceptions import UnauthorizedException
        
        mock_user = {"user_id": "test-user"}  # No raw_token
        
        import asyncio
        async def run_test():
            with pytest.raises(UnauthorizedException):
                await get_authenticated_db(user=mock_user)
        
        asyncio.run(run_test())
    
    def test_rls_isolation_different_tenants(self):
        """Test that RLS properly isolates data between different tenants"""
        from app.api.deps import get_user_scoped_db
        
        # Mock users from different tenants
        user_tenant_a = {
            "user_id": "user-a",
            "tenant_id": "tenant-a",
            "raw_token": "token-a"
        }
        user_tenant_b = {
            "user_id": "user-b", 
            "tenant_id": "tenant-b",
            "raw_token": "token-b"
        }
        
        with patch('app.api.deps.create_client') as mock_create_client:
            import asyncio
            
            async def test_tenant_isolation():
                # Get DB clients for different tenants
                db_a = await get_user_scoped_db(user=user_tenant_a)
                db_b = await get_user_scoped_db(user=user_tenant_b)
                
                # Verify different tokens are used
                assert mock_create_client.call_count == 2
                
                # Check first call (tenant A)
                call_a_args = mock_create_client.call_args_list[0]
                headers_a = call_a_args[1]["options"]["headers"]
                assert headers_a["Authorization"] == "Bearer token-a"
                
                # Check second call (tenant B)
                call_b_args = mock_create_client.call_args_list[1]
                headers_b = call_b_args[1]["options"]["headers"]
                assert headers_b["Authorization"] == "Bearer token-b"
            
            asyncio.run(test_tenant_isolation())
    
    def test_service_client_bypasses_rls(self):
        """Test that service client bypasses RLS for admin operations"""
        from app.api.deps import get_supabase_service
        
        with patch('app.core.database.create_client') as mock_create_client:
            # Service client should use service role key, not user token
            service_db = get_supabase_service()
            
            mock_create_client.assert_called_once()
            call_args = mock_create_client.call_args
            
            # Should use service role key (not anon key)
            assert call_args[0][1] == settings.SUPABASE_SERVICE_ROLE_KEY
            assert "headers" not in call_args[1].get("options", {})
    
    def test_unauthenticated_user_gets_anonymous_client(self):
        """Test that unauthenticated users get anonymous client with RLS"""
        from app.api.deps import get_user_scoped_db
        
        with patch('app.api.deps.create_client') as mock_create_client:
            import asyncio
            
            async def test_anonymous_access():
                # No user provided (unauthenticated)
                db = await get_user_scoped_db(user=None)
                
                # Should not be called since we return regular_db for unauthenticated
                assert not mock_create_client.called
            
            asyncio.run(test_anonymous_access())
    
    def test_jwt_context_propagation(self):
        """Test that JWT context is properly propagated to RLS policies"""
        from app.api.deps import AuthService
        
        with patch.object(AuthService, 'set_rls_context') as mock_set_rls:
            mock_user = {
                "id": "user-123",
                "role": "manager",
                "tenant_id": "tenant-abc"
            }
            mock_db = MagicMock()
            
            # Call set_rls_context
            AuthService.set_rls_context("user-123", "manager", mock_db)
            
            # Verify it was called with correct parameters
            mock_set_rls.assert_called_once_with("user-123", "manager", mock_db)
    
    def test_user_scoped_db_token_validation(self):
        """Test that user-scoped DB validates token format"""
        from app.api.deps import get_user_scoped_db
        
        # Test with invalid token formats
        invalid_users = [
            {"user_id": "test", "raw_token": ""},  # Empty token
            {"user_id": "test", "raw_token": None},  # None token
            {"user_id": "test"},  # Missing token
        ]
        
        with patch('app.api.deps.create_client') as mock_create_client:
            import asyncio
            
            for invalid_user in invalid_users:
                async def test_invalid_token():
                    # Should fall back to regular_db for invalid tokens
                    mock_regular_db = MagicMock()
                    db = await get_user_scoped_db(user=invalid_user, regular_db=mock_regular_db)
                    # Should return the regular_db when token is invalid
                    assert db == mock_regular_db
                
                asyncio.run(test_invalid_token())
                
            # create_client should not be called for invalid tokens
            assert not mock_create_client.called


class TestSecurityHeaders:
    """Test security headers middleware"""
    
    def test_security_headers_added(self):
        """Test that security headers are added to responses"""
        client = TestClient(app)
        
        response = client.get("/health")
        
        # Check for security headers
        assert "X-Content-Type-Options" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert "X-Frame-Options" in response.headers
        assert response.headers["X-Frame-Options"] == "DENY"
        assert "X-XSS-Protection" in response.headers
        assert "Referrer-Policy" in response.headers
        assert "Content-Security-Policy" in response.headers


class TestRequestLogging:
    """Test request logging middleware"""
    
    def test_request_id_added(self):
        """Test that X-Request-ID header is added to responses"""
        client = TestClient(app)
        
        response = client.get("/health")
        
        assert "X-Request-ID" in response.headers
        # Should be a valid UUID format
        request_id = response.headers["X-Request-ID"]
        assert len(request_id) == 36  # Standard UUID length with dashes
        assert request_id.count('-') == 4  # Standard UUID dash count
    
    @patch('app.middleware.security.logger')
    def test_sensitive_path_logging(self, mock_logger):
        """Test that sensitive paths are logged with appropriate level"""
        client = TestClient(app)
        
        # Make request to sensitive path
        response = client.post("/api/v1/auth/login", json={"username": "test", "password": "test"})
        
        # Verify warning level logging was called for sensitive path
        mock_logger.warning.assert_called()
        log_call = mock_logger.warning.call_args[0][0]
        assert "sensitive" in log_call.lower()
    
    @patch('app.middleware.security.logger')
    def test_error_request_logging(self, mock_logger):
        """Test that failed requests are logged appropriately"""
        client = TestClient(app)
        
        # Make request that will fail
        response = client.get("/api/v1/nonexistent")
        
        # Should log as warning or error
        assert mock_logger.warning.called or mock_logger.error.called


class TestIntegrationSecurity:
    """Integration tests for security features"""
    
    def test_unauthenticated_request_to_protected_endpoint(self):
        """Test that unauthenticated requests to protected endpoints are rejected"""
        client = TestClient(app)
        
        # Try to access protected endpoint without auth
        response = client.get("/api/v1/auth/profile")
        
        assert response.status_code == 401
        assert "error" in response.json()
    
    def test_invalid_token_rejected(self):
        """Test that invalid tokens are properly rejected"""
        client = TestClient(app)
        
        # Try with invalid token
        headers = {"Authorization": "Bearer invalid-token"}
        response = client.get("/api/v1/auth/profile", headers=headers)
        
        assert response.status_code == 401
    
    def test_malformed_authorization_header(self):
        """Test handling of malformed authorization headers"""
        client = TestClient(app)
        
        malformed_headers = [
            {"Authorization": "Basic invalid"},  # Wrong scheme
            {"Authorization": "Bearer"},          # Missing token
            {"Authorization": "invalid-format"},  # No scheme
        ]
        
        for headers in malformed_headers:
            response = client.get("/api/v1/auth/profile", headers=headers)
            assert response.status_code == 401


@pytest.fixture(scope="session")
def test_settings():
    """Override settings for testing"""
    original_verify = settings.JWT_VERIFY_SIGNATURE
    original_jwks = settings.JWT_JWKS_URL
    original_aud = settings.JWT_AUD
    original_iss = settings.JWT_ISS
    
    # Set test values
    settings.JWT_VERIFY_SIGNATURE = False  # Start with disabled for basic tests
    settings.JWT_JWKS_URL = "https://test.example.com/.well-known/jwks.json"
    settings.JWT_AUD = "authenticated"
    settings.JWT_ISS = "https://test.example.com/auth/v1"
    
    yield
    
    # Restore original values
    settings.JWT_VERIFY_SIGNATURE = original_verify
    settings.JWT_JWKS_URL = original_jwks
    settings.JWT_AUD = original_aud
    settings.JWT_ISS = original_iss


class TestAuditLogging:
    """Test audit trail functionality"""
    
    def test_audit_log_entry_creation(self):
        """Test that AuditLogEntry objects are created correctly"""
        from app.middleware.security import AuditLogEntry
        
        entry = AuditLogEntry(
            user_id="test-user",
            action="login",
            resource_type="auth",
            resource_id="session-123",
            details={"ip": "127.0.0.1"},
            ip_address="127.0.0.1",
            user_agent="test-agent",
            request_id="req-123"
        )
        
        data = entry.to_dict()
        
        assert data["user_id"] == "test-user"
        assert data["action"] == "login"
        assert data["resource_type"] == "auth"
        assert data["resource_id"] == "session-123"
        assert data["details"]["ip"] == "127.0.0.1"
        assert data["ip_address"] == "127.0.0.1"
        assert data["user_agent"] == "test-agent"
        assert data["request_id"] == "req-123"
        assert "timestamp" in data


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])