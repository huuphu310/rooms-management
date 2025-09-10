import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  Users,
  Shield,
  Key,
  MoreHorizontal,
  Plus,
  Search,
  Edit,
  Trash2,
  Lock,
  Unlock,
  UserPlus,
  Settings,
  Activity,
  ShieldCheck,
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  account_status: string;
  is_super_admin: boolean;
  roles: Role[];
  last_login_at?: string;
  created_at: string;
}

interface Role {
  id: string;
  role_code: string;
  role_name: string;
  description?: string;
  is_system: boolean;
  permissions_count?: number;
}

interface Permission {
  id: string;
  permission_code: string;
  permission_name: string;
  module: string;
  resource: string;
  action: string;
}

export default function UserManagement() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('users');
  const [isManagePermissionsOpen, setIsManagePermissionsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', searchTerm, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      
      const response = await api.get(`/user-management/users?${params}`);
      return response.data;
    },
  });

  // Fetch roles
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get('/user-management/roles');
      return response.data;
    },
  });

  // Fetch permissions
  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await api.get('/user-management/permissions?group_by_module=true');
      return response.data;
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await api.post('/user-management/users/create', userData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateUserOpen(false);
      toast({
        title: t('common.success'),
        description: t('common.createSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.response?.data?.detail || t('common.operationFailed'),
        variant: 'destructive',
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: any }) => {
      const response = await api.put(`/user-management/users/${userId}/update`, userData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditUserOpen(false);
      toast({
        title: t('common.success'),
        description: t('common.updateSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.response?.data?.detail || t('common.operationFailed'),
        variant: 'destructive',
      });
    },
  });

  // Block/Unblock user mutation
  const blockUserMutation = useMutation({
    mutationFn: async ({ userId, block }: { userId: string; block: boolean }) => {
      const endpoint = block
        ? `/user-management/users/${userId}/block`
        : `/user-management/users/${userId}/unblock`;
      const data = block
        ? { reason: 'Blocked by administrator', notify_user: true }
        : {};
      const response = await api.post(endpoint, data);
      return response.data;
    },
    onSuccess: (_, { block }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: t('common.success'),
        description: t('common.updateSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.response?.data?.detail || t('common.operationFailed'),
        variant: 'destructive',
      });
    },
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const response = await api.post(`/user-management/users/${userId}/assign-role`, {
        role_id: roleId,
        reason: 'Role assigned by administrator',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsAssignRoleOpen(false);
      toast({
        title: t('common.success'),
        description: t('common.updateSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.response?.data?.detail || t('common.operationFailed'),
        variant: 'destructive',
      });
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const response = await api.delete(`/user-management/users/${userId}/roles/${roleId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: t('common.success'),
        description: t('common.updateSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.response?.data?.detail || t('common.operationFailed'),
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
      blocked: 'destructive',
      suspended: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getRoleBadges = (roles: Role[], user: User) => {
    return roles.map((role) => (
      <div key={role.id} className="inline-flex items-center mr-1 mb-1">
        <Badge variant="outline" className="mr-1">
          {role.role_name}
        </Badge>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.confirm(`Remove role "${role.role_name}" from user "${user.full_name}"?`)) {
              removeRoleMutation.mutate({
                userId: user.id,
                roleId: role.id,
              });
            }
          }}
          className="text-red-500 hover:text-red-700 ml-1 text-xs"
          title={`Remove ${role.role_name} role`}
        >
          ×
        </button>
      </div>
    ));
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('userManagement.title')}</h1>
          <p className="text-muted-foreground">{t('userManagement.subtitle')}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('userManagement.userList')}
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('userManagement.role')}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            {t('userManagement.permissions')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('userManagement.userList')}</CardTitle>
                  <CardDescription>{t('userManagement.subtitle')}</CardDescription>
                </div>
                <Button onClick={() => setIsCreateUserOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('userManagement.newUser')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('common.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('common.filterByStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')} {t('common.status')}</SelectItem>
                    <SelectItem value="active">{t('userManagement.active')}</SelectItem>
                    <SelectItem value="inactive">{t('userManagement.inactive')}</SelectItem>
                    <SelectItem value="blocked">{t('userManagement.locked')}</SelectItem>
                    <SelectItem value="suspended">{t('userManagement.suspended')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {usersLoading ? (
                <div className="text-center py-4">{t('common.loading')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('userManagement.username')}</TableHead>
                      <TableHead>{t('userManagement.fullName')}</TableHead>
                      <TableHead>{t('userManagement.email')}</TableHead>
                      <TableHead>{t('userManagement.department')}</TableHead>
                      <TableHead>{t('userManagement.role')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>{t('userManagement.lastLogin')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.users?.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.username}
                          {user.is_super_admin && (
                            <ShieldCheck className="inline ml-1 h-4 w-4 text-primary" />
                          )}
                        </TableCell>
                        <TableCell>{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.department || t('common.notAvailable')}</TableCell>
                        <TableCell>{getRoleBadges(user.roles, user)}</TableCell>
                        <TableCell>{getStatusBadge(user.account_status)}</TableCell>
                        <TableCell>
                          {user.last_login_at
                            ? new Date(user.last_login_at).toLocaleDateString()
                            : t('common.never')}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsEditUserOpen(true);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsAssignRoleOpen(true);
                                }}
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                {t('common.assignRole')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  blockUserMutation.mutate({
                                    userId: user.id,
                                    block: user.account_status !== 'blocked',
                                  })
                                }
                              >
                                {user.account_status === 'blocked' ? (
                                  <>
                                    <Unlock className="mr-2 h-4 w-4" />
                                    {t('common.unblock')}
                                  </>
                                ) : (
                                  <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    {t('common.block')}
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Roles</CardTitle>
                  <CardDescription>Manage roles and their permissions</CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Role
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="text-center py-4">Loading roles...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role Code</TableHead>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rolesData?.roles?.map((role: Role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.role_code}</TableCell>
                        <TableCell>{role.role_name}</TableCell>
                        <TableCell>{role.description || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={role.is_system ? 'destructive' : 'default'}>
                            {role.is_system ? 'System' : 'Custom'}
                          </Badge>
                        </TableCell>
                        <TableCell>{role.permissions_count || 0}</TableCell>
                        <TableCell>
                          <Badge variant="default">Active</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRole(role);
                                  setIsManagePermissionsOpen(true);
                                  // Fetch current permissions for this role
                                  api.get(`/user-management/roles/${role.id}/permissions`)
                                    .then(res => {
                                      // Use the assigned_permission_ids field for easy comparison
                                      const assignedPermissionIds = res.data.assigned_permission_ids || [];
                                      setSelectedPermissions(assignedPermissionIds);
                                    })
                                    .catch(err => {
                                      console.error('Failed to fetch role permissions:', err);
                                      setSelectedPermissions([]);
                                    });
                                }}
                              >
                                <Settings className="mr-2 h-4 w-4" />
                                Manage Permissions
                              </DropdownMenuItem>
                              {!role.is_system && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      toast({
                                        title: "Edit Role",
                                        description: "Edit role functionality coming soon",
                                      });
                                    }}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => {
                                      toast({
                                        title: "Delete Role",
                                        description: "Delete role functionality coming soon",
                                        variant: "destructive",
                                      });
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
              <CardDescription>View all system permissions grouped by module</CardDescription>
            </CardHeader>
            <CardContent>
              {permissionsLoading ? (
                <div className="text-center py-4">Loading permissions...</div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(permissionsData?.grouped_by_module || {}).map(
                    ([module, permissions]: [string, any]) => (
                      <div key={module}>
                        <h3 className="text-lg font-semibold capitalize mb-3">{module}</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Permission Code</TableHead>
                              <TableHead>Permission Name</TableHead>
                              <TableHead>Resource</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {permissions.map((permission: Permission) => (
                              <TableRow key={permission.id}>
                                <TableCell className="font-mono text-sm">
                                  {permission.permission_code}
                                </TableCell>
                                <TableCell>{permission.permission_name}</TableCell>
                                <TableCell>{permission.resource}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{permission.action}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('userManagement.newUser')}</DialogTitle>
            <DialogDescription>{t('userManagement.subtitle')}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createUserMutation.mutate({
                username: formData.get('username'),
                email: formData.get('email'),
                full_name: formData.get('full_name'),
                role: formData.get('role'),
                phone: formData.get('phone'),
                department: formData.get('department'),
                position: formData.get('position'),
                temporary_password: formData.get('password'),
                send_welcome_email: true,
              });
            }}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">{t('userManagement.username')}</Label>
                <Input id="username" name="username" required />
              </div>
              <div>
                <Label htmlFor="email">{t('userManagement.email')}</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="full_name">{t('userManagement.fullName')}</Label>
                <Input id="full_name" name="full_name" required />
              </div>
              <div>
                <Label htmlFor="role">{t('userManagement.role')}</Label>
                <Select name="role" defaultValue={rolesData?.roles?.find((r: Role) => r.role_code === 'RECEPTIONIST')?.id || ''} required>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.selectOption')} />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesData?.roles?.map((role: Role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.role_name} ({role.role_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="phone">{t('userManagement.phone')}</Label>
                <Input id="phone" name="phone" />
              </div>
              <div>
                <Label htmlFor="department">{t('userManagement.department')}</Label>
                <Input id="department" name="department" />
              </div>
              <div>
                <Label htmlFor="position">{t('userManagement.position')}</Label>
                <Input id="position" name="position" />
              </div>
              <div>
                <Label htmlFor="password">{t('common.temporaryPassword')}</Label>
                <Input id="password" name="password" type="password" required />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateUserOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? t('common.creating') : t('userManagement.newUser')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog open={isAssignRoleOpen} onOpenChange={setIsAssignRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const roleId = formData.get('role_id');
              if (selectedUser && roleId) {
                assignRoleMutation.mutate({
                  userId: selectedUser.id,
                  roleId: roleId as string,
                });
              }
            }}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="role_id">Role</Label>
                <Select name="role_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesData?.roles?.map((role: Role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.role_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsAssignRoleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignRoleMutation.isPending}>
                {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update information for {selectedUser?.full_name}
              {/* Debug info: {JSON.stringify({email: selectedUser?.email, id: selectedUser?.id})} */}
            </DialogDescription>
          </DialogHeader>
          <form
            key={selectedUser?.id} // Add key to force re-render when user changes
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              if (selectedUser) {
                updateUserMutation.mutate({
                  userId: selectedUser.id,
                  userData: {
                    username: formData.get('username'),
                    full_name: formData.get('full_name'),
                    phone: formData.get('phone'),
                    department: formData.get('department'),
                    position: formData.get('position'),
                  },
                });
              }
            }}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_username">Username</Label>
                <Input 
                  key={`username-${selectedUser?.id}`}
                  id="edit_username" 
                  name="username" 
                  defaultValue={selectedUser?.username || ''}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="edit_full_name">Full Name</Label>
                <Input 
                  key={`fullname-${selectedUser?.id}`}
                  id="edit_full_name" 
                  name="full_name" 
                  defaultValue={selectedUser?.full_name || ''}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="edit_phone">Phone</Label>
                <Input 
                  key={`phone-${selectedUser?.id}`}
                  id="edit_phone" 
                  name="phone" 
                  defaultValue={selectedUser?.phone || ''}
                />
              </div>
              <div>
                <Label htmlFor="edit_department">Department</Label>
                <Input 
                  key={`dept-${selectedUser?.id}`}
                  id="edit_department" 
                  name="department" 
                  defaultValue={selectedUser?.department || ''}
                />
              </div>
              <div>
                <Label htmlFor="edit_position">Position</Label>
                <Input 
                  key={`position-${selectedUser?.id}`}
                  id="edit_position" 
                  name="position" 
                  defaultValue={selectedUser?.position || ''}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditUserOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Role Permissions Dialog */}
      <Dialog open={isManagePermissionsOpen} onOpenChange={setIsManagePermissionsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Permissions for {selectedRole?.role_name}</DialogTitle>
            <DialogDescription>
              Select which permissions this role should have
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {permissionsLoading ? (
              <div className="text-center py-4">Loading permissions...</div>
            ) : (
              <div className="space-y-6">
                {Object.entries(permissionsData?.grouped_by_module || {}).map(
                  ([module, permissions]: [string, any]) => (
                    <div key={module} className="border rounded-lg p-4">
                      <h3 className="text-lg font-semibold capitalize mb-3">{module}</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {permissions.map((permission: Permission) => (
                          <label
                            key={permission.id}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300"
                              checked={selectedPermissions.includes(permission.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPermissions([...selectedPermissions, permission.id]);
                                } else {
                                  setSelectedPermissions(
                                    selectedPermissions.filter((id) => id !== permission.id)
                                  );
                                }
                              }}
                            />
                            <span className="text-sm">
                              {permission.permission_name} ({permission.action})
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsManagePermissionsOpen(false);
                setSelectedRole(null);
                setSelectedPermissions([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedRole) {
                  api
                    .put(`/user-management/roles/${selectedRole.id}/permissions`, {
                      permission_ids: selectedPermissions,
                    })
                    .then(() => {
                      toast({
                        title: "Permissions Updated",
                        description: `Permissions for ${selectedRole.role_name} have been updated successfully.`,
                      });
                      queryClient.invalidateQueries({ queryKey: ['roles'] });
                      setIsManagePermissionsOpen(false);
                      setSelectedRole(null);
                      setSelectedPermissions([]);
                    })
                    .catch((err) => {
                      toast({
                        title: "Error",
                        description: "Failed to update permissions. Please try again.",
                        variant: "destructive",
                      });
                    });
                }
              }}
            >
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}