from typing import Dict, Optional, Any
from supabase import Client, create_client
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class AuthService:
    """Authentication service for handling Supabase auth operations"""
    
    @classmethod
    async def login_with_email_password(
        cls,
        email: str,
        password: str,
        db: Client  # This should be the service client
    ) -> Dict[str, Any]:
        """
        Login user with email and password using Supabase Auth
        Returns role_id, raw_app_meta_data, and raw_user_meta_data as requested
        
        Args:
            email: User email
            password: User password
            db: Supabase client
            
        Returns:
            Dict containing user data, tokens, role_id, and metadata
        """
        try:
            # Use Supabase auth to sign in
            response = db.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if response.user and response.session:
                # IMPORTANT: Create a fresh service client to bypass RLS
                # The db parameter passed might not have the right permissions
                service_client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_KEY
                )
                logger.info(f"Querying user_profiles for user_id: {response.user.id}")
                logger.info(f"Using fresh service client with service key")
                
                user_profile_response = service_client.table("user_profiles").select(
                    "id, username, full_name, display_name, avatar_url, "
                    "is_super_admin, account_status, department, position, "
                    "created_at, updated_at"
                ).eq("id", str(response.user.id)).execute()  # Ensure ID is string
                
                # Handle the response - get first row if exists
                user_profile = {}
                if user_profile_response.data and len(user_profile_response.data) > 0:
                    user_profile = user_profile_response.data[0]
                    logger.info(f"User profile found for {email}: is_super_admin={user_profile.get('is_super_admin')}")
                else:
                    logger.warning(f"No user profile found for user {response.user.id}")
                
                # Get user roles with detailed information using service client
                user_roles_response = service_client.table("user_roles").select(
                    "role_id, roles(id, role_name, role_code)"
                ).eq("user_id", response.user.id).eq("is_active", True).execute()
                
                primary_role = None
                roles = []
                if user_roles_response.data:
                    for ur in user_roles_response.data:
                        if ur.get("roles"):
                            roles.append(ur["roles"])
                    # Use the first active role as primary
                    if roles:
                        primary_role = roles[0]
                        primary_role["role_id"] = user_roles_response.data[0]["role_id"]

                # Extract metadata from Supabase user object
                raw_app_meta_data = response.user.app_metadata or {}
                raw_user_meta_data = response.user.user_metadata or {}
                
                # Add role information to app_metadata if we have a role
                if primary_role:
                    raw_app_meta_data.update({
                        "role_id": primary_role["id"],
                        "role_code": primary_role["role_code"],
                        "role_name": primary_role["role_name"]
                    })
                else:
                    # Default role if no role assigned
                    raw_app_meta_data.update({
                        "role_id": None,
                        "role_code": "RECEPTIONIST",
                        "role_name": "Receptionist"
                    })
                
                # Combine Supabase user data with our profile data
                user_data = {
                    "id": response.user.id,
                    "email": response.user.email,
                    "email_confirmed_at": response.user.email_confirmed_at,
                    "phone": response.user.phone,
                    "phone_confirmed_at": response.user.phone_confirmed_at,
                    "username": user_profile.get("username"),
                    "full_name": user_profile.get("full_name"),
                    "display_name": user_profile.get("display_name"),
                    "avatar_url": user_profile.get("avatar_url"),
                    "is_super_admin": user_profile.get("is_super_admin", False),
                    "account_status": user_profile.get("account_status", "active"),
                    "department": user_profile.get("department"),
                    "position": user_profile.get("position"),
                    "roles": roles,
                    "primary_role": primary_role,
                    "created_at": user_profile.get("created_at"),
                    "updated_at": user_profile.get("updated_at"),
                    # Include the requested metadata fields
                    "role_id": primary_role["id"] if primary_role else None,
                    "raw_app_meta_data": raw_app_meta_data,
                    "raw_user_meta_data": raw_user_meta_data
                }
                
                return {
                    "success": True,
                    "user": user_data,
                    "session": {
                        "access_token": response.session.access_token,
                        "refresh_token": response.session.refresh_token,
                        "expires_at": response.session.expires_at,
                        "expires_in": response.session.expires_in,
                        "token_type": response.session.token_type
                    },
                    # Direct access to requested fields at root level
                    "role_id": primary_role["id"] if primary_role else None,
                    "raw_app_meta_data": raw_app_meta_data,
                    "raw_user_meta_data": raw_user_meta_data
                }
            else:
                logger.warning(f"Login failed for email: {email}")
                return {
                    "success": False,
                    "error": "Invalid email or password",
                    "code": "INVALID_CREDENTIALS"
                }
                
        except Exception as e:
            logger.error(f"Login error for {email}: {str(e)}")
            error_message = str(e)
            
            # Handle specific Supabase auth errors
            if "Invalid login credentials" in error_message:
                return {
                    "success": False,
                    "error": "Invalid email or password",
                    "code": "INVALID_CREDENTIALS"
                }
            elif "Email not confirmed" in error_message:
                return {
                    "success": False,
                    "error": "Please confirm your email address",
                    "code": "EMAIL_NOT_CONFIRMED"
                }
            elif "Too many requests" in error_message:
                return {
                    "success": False,
                    "error": "Too many login attempts. Please try again later",
                    "code": "TOO_MANY_REQUESTS"
                }
            else:
                return {
                    "success": False,
                    "error": "Login failed. Please try again",
                    "code": "LOGIN_ERROR"
                }
    
    @classmethod
    async def refresh_token(
        cls,
        refresh_token: str,
        db: Client
    ) -> Dict[str, Any]:
        """
        Refresh access token using refresh token
        
        Args:
            refresh_token: Refresh token
            db: Supabase client
            
        Returns:
            Dict containing new tokens
        """
        try:
            response = db.auth.refresh_session(refresh_token)
            
            if response.session:
                return {
                    "success": True,
                    "session": {
                        "access_token": response.session.access_token,
                        "refresh_token": response.session.refresh_token,
                        "expires_at": response.session.expires_at,
                        "expires_in": response.session.expires_in,
                        "token_type": response.session.token_type
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "Invalid refresh token",
                    "code": "INVALID_REFRESH_TOKEN"
                }
                
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            return {
                "success": False,
                "error": "Failed to refresh token",
                "code": "REFRESH_ERROR"
            }
    
    @classmethod
    async def logout(
        cls,
        access_token: str,
        db: Client
    ) -> Dict[str, Any]:
        """
        Logout user by invalidating session
        
        Args:
            access_token: Access token
            db: Supabase client
            
        Returns:
            Dict containing logout result
        """
        try:
            # Set the session before signing out
            db.auth.set_session(access_token, None)
            response = db.auth.sign_out()
            
            return {
                "success": True,
                "message": "Logout successful"
            }
                
        except Exception as e:
            logger.error(f"Logout error: {str(e)}")
            return {
                "success": False,
                "error": "Logout failed",
                "code": "LOGOUT_ERROR"
            }
    
    @classmethod
    async def get_user_profile(
        cls,
        user_id: str,
        db: Client
    ) -> Optional[Dict[str, Any]]:
        """
        Get user profile by user ID
        
        Args:
            user_id: User ID
            db: Supabase client
            
        Returns:
            User profile data or None
        """
        try:
            response = db.table("user_profiles").select(
                "id, username, full_name, display_name, avatar_url, "
                "is_super_admin, account_status, department, position, "
                "created_at, updated_at"
            ).eq("id", user_id).single().execute()
            
            if response.data:
                # Get user roles
                user_roles_response = db.table("user_roles").select(
                    "roles(id, role_name, role_code)"
                ).eq("user_id", user_id).eq("is_active", True).execute()
                
                roles = []
                if user_roles_response.data:
                    for ur in user_roles_response.data:
                        if ur.get("roles"):
                            roles.append(ur["roles"])
                
                user_data = response.data
                user_data["roles"] = roles
                
                return user_data
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching user profile for {user_id}: {str(e)}")
            return None
