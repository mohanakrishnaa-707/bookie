import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, UserCheck, UserX, Mail, Settings } from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string;
  role: 'admin' | 'teacher';
  department: string;
  created_at: string;
  updated_at: string;
}

interface SystemSettings {
  id: string;
  request_deadline: string | null;
  teacher_registration_enabled: boolean;
  admin_registration_enabled: boolean;
}

const AdminUsers = () => {
  const { profile } = useAuthStore();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchSystemSettings();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, departmentFilter]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSystemSettings(data);
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(user => user.department === departmentFilter);
    }

    setFilteredUsers(filtered);
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'teacher') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ));

      // Log activity
      await supabase.from('activity_logs').insert([{
        user_id: profile?.id,
        action: 'UPDATE_USER_ROLE',
        description: `Changed user role to ${newRole}`
      }]);

      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateRegistrationSettings = async (field: 'teacher_registration_enabled' | 'admin_registration_enabled', value: boolean) => {
    if (!systemSettings) return;

    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ [field]: value })
        .eq('id', systemSettings.id);

      if (error) throw error;

      setSystemSettings(prev => prev ? { ...prev, [field]: value } : null);
      
      const settingName = field === 'teacher_registration_enabled' ? 'Teacher Registration' : 'Admin Registration';
      toast({
        title: "Success",
        description: `${settingName} ${value ? 'enabled' : 'disabled'}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const departments = [
    { value: 'automobile_engineering', label: 'Automobile Engineering' },
    { value: 'civil_engineering', label: 'Civil Engineering' },
    { value: 'mechanical_engineering', label: 'Mechanical Engineering' },
    { value: 'electrical_and_electronics_engineering', label: 'Electrical and Electronics Engineering' },
    { value: 'electronics_and_communication_engineering', label: 'Electronics and Communication Engineering' },
    { value: 'vlsi', label: 'VLSI' },
    { value: 'advanced_communication_technology', label: 'Advanced Communication Technology' },
    { value: 'artificial_intelligence_and_data_science', label: 'Artificial Intelligence and Data Science' },
    { value: 'computer_science_and_engineering', label: 'Computer Science and Engineering' },
    { value: 'artificial_intelligence_and_machine_learning', label: 'Artificial Intelligence and Machine Learning' },
    { value: 'cse_cybersecurity', label: 'CSE (Cybersecurity)' },
    { value: 'information_technology', label: 'Information Technology' },
    { value: 'computer_application_mca', label: 'Computer Application (MCA)' },
    { value: 'science_and_humanities', label: 'Science and Humanities' },
    { value: 'me_applied_electronics', label: 'M.E. Applied Electronics' },
    { value: 'me_cad_cam', label: 'M.E. CAD / CAM' },
    { value: 'me_computer_science_and_engineer', label: 'M.E. Computer Science and Engineer' },
    { value: 'me_communication_systems', label: 'M.E. Communication Systems' },
    { value: 'me_structural_engineer', label: 'M.E. Structural Engineer' },
  ];

  const getDepartmentLabel = (value: string) => {
    return departments.find(d => d.value === value)?.label || value.replace('_', ' ');
  };

  const getStats = () => {
    const totalUsers = users.length;
    const adminUsers = users.filter(u => u.role === 'admin').length;
    const teacherUsers = users.filter(u => u.role === 'teacher').length;
    const departmentCounts = departments.reduce((acc, dept) => {
      acc[dept.value] = users.filter(u => u.department === dept.value).length;
      return acc;
    }, {} as { [key: string]: number });

    return { totalUsers, adminUsers, teacherUsers, departmentCounts };
  };

  if (profile?.role !== 'admin') {
    return <div className="text-center">Access denied. Admin only.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts, roles, and permissions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.adminUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.teacherUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.departmentCounts).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Users</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Role</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Department</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Registration Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Teacher Registration</label>
                <p className="text-xs text-muted-foreground">
                  Allow new teachers to register accounts
                </p>
              </div>
              <Switch
                checked={systemSettings?.teacher_registration_enabled ?? true}
                onCheckedChange={(checked) => updateRegistrationSettings('teacher_registration_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Admin Registration</label>
                <p className="text-xs text-muted-foreground">
                  Allow new admins to register accounts
                </p>
              </div>
              <Switch
                checked={systemSettings?.admin_registration_enabled ?? true}
                onCheckedChange={(checked) => updateRegistrationSettings('admin_registration_enabled', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Users ({filteredUsers.length} of {users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-32">Name</TableHead>
                  <TableHead className="min-w-20">Role</TableHead>
                  <TableHead className="min-w-32 hidden sm:table-cell">Department</TableHead>
                  <TableHead className="min-w-24 hidden md:table-cell">Joined</TableHead>
                  <TableHead className="min-w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{user.full_name}</div>
                        <div className="text-xs text-muted-foreground sm:hidden capitalize">
                          {getDepartmentLabel(user.department)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize hidden sm:table-cell">
                      {getDepartmentLabel(user.department)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {user.id !== profile?.id && (
                        <div className="flex gap-1">
                          {user.role === 'teacher' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateUserRole(user.id, 'admin')}
                              className="text-xs px-2 py-1"
                            >
                              <span className="hidden sm:inline">Make </span>Admin
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateUserRole(user.id, 'teacher')}
                              className="text-xs px-2 py-1"
                            >
                              <span className="hidden sm:inline">Make </span>Teacher
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching the current filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;