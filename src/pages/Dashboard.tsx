import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Users, 
  BookOpen, 
  FileSpreadsheet, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  CalendarIcon,
  Timer,
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalRequests: number;
  pendingSheets: number;
  completedPurchases: number;
  recentActivity: any[];
}

interface SystemSettings {
  id: string;
  request_deadline: string | null;
  teacher_registration_enabled: boolean;
  admin_registration_enabled: boolean;
}

const Dashboard = () => {
  const { profile } = useAuthStore();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalRequests: 0,
    pendingSheets: 0,
    completedPurchases: 0,
    recentActivity: [],
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('23:59');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile) return;

    try {
      if (profile.role === 'admin') {
        // Fetch admin dashboard data and system settings
        const [usersResponse, requestsResponse, sheetsResponse, purchasesResponse, activityResponse, settingsResponse] = await Promise.all([
          supabase.from('profiles').select('id').eq('role', 'teacher'),
          supabase.from('book_requests').select('id'),
          supabase.from('purchase_sheets').select('id').eq('status', 'pending'),
          supabase.from('finalized_purchases').select('id'),
          supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(5),
          supabase.from('system_settings').select('*').single(),
        ]);

        setStats({
          totalUsers: usersResponse.data?.length || 0,
          totalRequests: requestsResponse.data?.length || 0,
          pendingSheets: sheetsResponse.data?.length || 0,
          completedPurchases: purchasesResponse.data?.length || 0,
          recentActivity: activityResponse.data || [],
        });

        if (settingsResponse.data) {
          setSystemSettings(settingsResponse.data);
          if (settingsResponse.data.request_deadline) {
            const deadline = new Date(settingsResponse.data.request_deadline);
            setSelectedDate(deadline);
            setSelectedTime(format(deadline, 'HH:mm'));
          }
        }
      } else {
        // Fetch teacher dashboard data
        const [requestsResponse, sheetsResponse, notesResponse] = await Promise.all([
          supabase.from('book_requests').select('*').eq('teacher_id', profile.id),
          supabase.from('purchase_sheets').select('*').eq('assigned_to', profile.id),
          supabase.from('teacher_notes').select('*').eq('teacher_id', profile.id),
        ]);

        setStats({
          totalUsers: 0,
          totalRequests: requestsResponse.data?.length || 0,
          pendingSheets: sheetsResponse.data?.filter(s => s.status === 'pending').length || 0,
          completedPurchases: notesResponse.data?.length || 0,
          recentActivity: requestsResponse.data?.slice(0, 5) || [],
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestDeadline = async () => {
    if (!selectedDate || profile?.role !== 'admin') return;

    try {
      const [hours, minutes] = selectedTime.split(':');
      const deadline = new Date(selectedDate);
      deadline.setHours(parseInt(hours), parseInt(minutes));

      const { error } = await supabase
        .from('system_settings')
        .update({ request_deadline: deadline.toISOString() })
        .eq('id', systemSettings?.id);

      if (error) throw error;

      setSystemSettings(prev => prev ? { ...prev, request_deadline: deadline.toISOString() } : null);
      
      toast({
        title: "Success",
        description: "Request deadline updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {isAdmin ? 'Admin Dashboard' : 'Teacher Dashboard'}
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.full_name}! Here's what's happening with your library system.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {isAdmin ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Registered faculty members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Book Requests</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRequests}</div>
                <p className="text-xs text-muted-foreground">
                  Total book requests submitted
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Sheets</CardTitle>
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingSheets}</div>
                <p className="text-xs text-muted-foreground">
                  Purchase sheets awaiting action
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Purchases</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedPurchases}</div>
                <p className="text-xs text-muted-foreground">
                  Finalized book purchases
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Requests</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRequests}</div>
                <p className="text-xs text-muted-foreground">
                  Book requests submitted
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Sheets</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingSheets}</div>
                <p className="text-xs text-muted-foreground">
                  Sheets awaiting completion
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Notes</CardTitle>
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedPurchases}</div>
                <p className="text-xs text-muted-foreground">
                  Saved notes and ideas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Department</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold capitalize">
                  {profile?.department?.replace('_', ' ')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Your department
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Request Deadline Timer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Deadline Date</label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setCalendarOpen(false);
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Deadline Time</label>
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={updateRequestDeadline} className="w-full sm:w-auto">
              Update Deadline
            </Button>

            {systemSettings?.request_deadline && (
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-sm font-medium">Current Deadline:</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(systemSettings.request_deadline), "PPP 'at' p")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No recent activity to display
            </p>
          ) : (
            <div className="space-y-4">
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 pb-4 border-b border-border last:border-0">
                  <div className="flex-shrink-0 mt-1">
                    {isAdmin ? (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    ) : activity.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {isAdmin 
                        ? activity.description || activity.action
                        : `Book Request: ${activity.book_name}`
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isAdmin 
                        ? new Date(activity.created_at).toLocaleDateString()
                        : `Author: ${activity.author} • ${activity.quantity} copies`
                      }
                    </p>
                  </div>
                  <Badge variant={
                    isAdmin ? 'secondary' : 
                    activity.status === 'completed' ? 'default' : 'secondary'
                  }>
                    {isAdmin ? 'System' : activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;