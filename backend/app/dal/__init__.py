"""
Data Access Layer (DAL) for Backend-Only Gateway approach
All DAL modules use service_key and enforce tenant scoping
"""

from .buildings import BuildingsDAL

__all__ = ["BuildingsDAL"]