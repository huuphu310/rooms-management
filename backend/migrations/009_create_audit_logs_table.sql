-- ================================================================
-- Create Audit Logs Table for Security Monitoring
-- ================================================================

-- Create audit_logs table for comprehensive security monitoring
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    request_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Add indexes for common queries
    INDEX idx_audit_logs_user_id (user_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_resource_type (resource_type),
    INDEX idx_audit_logs_created_at (created_at),
    INDEX idx_audit_logs_request_id (request_id)
);

-- Add comments for documentation
COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit trail for security monitoring and compliance';
COMMENT ON COLUMN public.audit_logs.user_id IS 'ID of user who performed the action (nullable for anonymous actions)';
COMMENT ON COLUMN public.audit_logs.action IS 'Action performed (login, logout, create, update, delete, etc.)';
COMMENT ON COLUMN public.audit_logs.resource_type IS 'Type of resource affected (user, booking, room, etc.)';
COMMENT ON COLUMN public.audit_logs.resource_id IS 'ID of specific resource affected';
COMMENT ON COLUMN public.audit_logs.details IS 'Additional context and metadata in JSON format';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'IP address of the client making the request';
COMMENT ON COLUMN public.audit_logs.user_agent IS 'User agent string from the request';
COMMENT ON COLUMN public.audit_logs.request_id IS 'Unique request ID for correlation with application logs';

-- Enable RLS on audit_logs table
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit_logs
-- Only admins can read audit logs (for security monitoring)
CREATE POLICY "audit_logs_admin_read" 
ON public.audit_logs FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND (role = 'admin' OR is_super_admin = true)
    )
);

-- System can always insert audit logs (using service role)
CREATE POLICY "audit_logs_system_insert" 
ON public.audit_logs FOR INSERT 
WITH CHECK (true);

-- No updates or deletes allowed on audit logs (immutable for compliance)
-- This is achieved by not creating UPDATE/DELETE policies

-- Grant permissions
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO service_role;
GRANT SELECT ON public.audit_logs TO service_role;

-- Create helper function for common audit actions
CREATE OR REPLACE FUNCTION public.create_audit_log(
    p_user_id UUID DEFAULT NULL,
    p_action VARCHAR(100) DEFAULT NULL,
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id VARCHAR(255) DEFAULT NULL,
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_request_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
    INSERT INTO public.audit_logs (
        user_id, 
        action, 
        resource_type, 
        resource_id, 
        details, 
        ip_address, 
        user_agent, 
        request_id
    ) VALUES (
        p_user_id,
        p_action,
        p_resource_type,
        p_resource_id,
        p_details,
        p_ip_address,
        p_user_agent,
        p_request_id
    ) RETURNING id;
$$;

COMMENT ON FUNCTION public.create_audit_log IS 'Helper function to create audit log entries with proper security context';

-- Create view for audit log summaries (for admin dashboard)
CREATE VIEW public.audit_logs_summary AS
SELECT 
    action,
    resource_type,
    COUNT(*) as action_count,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as first_occurrence,
    MAX(created_at) as last_occurrence
FROM public.audit_logs 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY action, resource_type
ORDER BY action_count DESC;

COMMENT ON VIEW public.audit_logs_summary IS 'Summary of audit log activity in the last 24 hours for admin dashboard';

-- Grant permissions on the view
GRANT SELECT ON public.audit_logs_summary TO authenticated;

-- Create indexes for better query performance on large datasets
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action 
ON public.audit_logs (user_id, action) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
ON public.audit_logs (resource_type, resource_id) 
WHERE resource_id IS NOT NULL;

-- Create partial index for recent logs (most commonly queried)
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent 
ON public.audit_logs (created_at DESC, action, resource_type) 
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Add constraint to ensure required fields
ALTER TABLE public.audit_logs 
ADD CONSTRAINT chk_audit_logs_required 
CHECK (action IS NOT NULL AND resource_type IS NOT NULL);

-- Add constraint for valid actions (can be extended as needed)
ALTER TABLE public.audit_logs 
ADD CONSTRAINT chk_audit_logs_valid_action 
CHECK (action IN (
    'login', 'logout', 'login_failed',
    'create', 'read', 'update', 'delete',
    'export', 'import', 'backup', 'restore',
    'role_change', 'permission_change',
    'password_change', 'password_reset',
    'checkout', 'checkin', 'payment',
    'invoice_generate', 'invoice_send',
    'admin_access', 'system_action'
));

-- Add data retention policy comment (to be implemented by admin)
COMMENT ON TABLE public.audit_logs IS 'Audit logs table with comprehensive security monitoring. Consider implementing data retention policy to archive logs older than regulatory requirements (e.g., 7 years).';

-- Create notification trigger for critical security events
CREATE OR REPLACE FUNCTION public.notify_critical_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Notify on critical security events
    IF NEW.action IN ('login_failed', 'admin_access', 'role_change', 'permission_change') THEN
        -- In a real implementation, this would send alerts
        -- For now, just log to PostgreSQL log
        RAISE NOTICE 'Critical security event: % by user % from IP %', 
            NEW.action, NEW.user_id, NEW.ip_address;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for critical events
DROP TRIGGER IF EXISTS trigger_critical_audit_events ON public.audit_logs;
CREATE TRIGGER trigger_critical_audit_events
    AFTER INSERT ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_critical_audit_event();