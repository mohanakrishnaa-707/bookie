import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Lock, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const { profile, updateProfile, changePassword } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    department: profile?.department || '',
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileData.full_name.trim()) {
      toast({
        title: "Error",
        description: "Full name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await updateProfile({
        full_name: profileData.full_name.trim(),
        department: profileData.department as any,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      }
    } catch (error) {
      console.error('Update profile error:', error);
    }
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in both password fields",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await changePassword(passwordData.newPassword);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Password changed successfully",
        });
        setPasswordData({ newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      console.error('Change password error:', error);
    }
    setPasswordLoading(false);
  };

  const handleForgotPassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        profile?.id || '',
        {
          redirectTo: `${window.location.origin}/auth`,
        }
      );

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Reset Email Sent",
          description: "Check your email for password reset instructions",
        });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account information and security settings
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={profileData.department}
                onValueChange={(value) => setProfileData({ ...profileData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="px-3 py-2 bg-muted rounded-md">
                <span className="text-sm capitalize">{profile?.role}</span>
                <p className="text-xs text-muted-foreground">
                  Role cannot be changed. Contact administrator for role updates.
                </p>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Update Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Change Password */}
          <div>
            <h3 className="font-medium mb-3">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                />
              </div>

              <Button type="submit" disabled={passwordLoading} className="w-full sm:w-auto">
                {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </form>
          </div>

          {/* Forgot Password */}
          <div className="border-t pt-6">
            <h3 className="font-medium mb-3">Forgot Password</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Send a password reset email to your registered email address
            </p>
            <Button variant="outline" onClick={handleForgotPassword}>
              Send Reset Email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;