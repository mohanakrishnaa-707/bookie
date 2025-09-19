import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileSpreadsheet, Download, ArrowRight, Users, CheckSquare } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import * as XLSX from 'xlsx';

const AdminCreatePurchase = () => {
  const { profile } = useAuthStore();
  const { toast } = useToast();
  const [sheets, setSheets] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [consolidating, setConsolidating] = useState(false);
  
  const [newSheet, setNewSheet] = useState({
    sheet_name: '',
    assigned_to: '',
    department: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sheetsResponse, teachersResponse] = await Promise.all([
        supabase.from('purchase_sheets').select(`
          *,
          assigned_teacher:assigned_to(full_name, department),
          creator:created_by(full_name)
        `).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'teacher')
      ]);

      if (sheetsResponse.data) setSheets(sheetsResponse.data);
      if (teachersResponse.data) setTeachers(teachersResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleCreateSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSheet.sheet_name || !newSheet.assigned_to || !newSheet.department) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (newSheet.assigned_to === "all") {
        // Create sheets for all teachers
        const sheetPromises = teachers.map(async (teacher) => {
          const { data, error } = await supabase
            .from('purchase_sheets')
            .insert({
              sheet_name: `${newSheet.sheet_name} - ${teacher.full_name}`,
              assigned_to: teacher.id,
              created_by: profile?.id,
              department: teacher.department,
              status: 'pending'
            })
            .select()
            .single();

          if (error) throw error;
          return data;
        });

        await Promise.all(sheetPromises);

        // Log activity
        await supabase.from('activity_logs').insert([{
          user_id: profile?.id,
          action: 'CREATE_SHEET',
          description: `Created purchase sheets "${newSheet.sheet_name}" for all ${teachers.length} teachers`
        }]);

        toast({
          title: "Success",
          description: `${teachers.length} purchase sheets created successfully`,
        });
      } else {
        // Create single sheet
        const { data, error } = await supabase
          .from('purchase_sheets')
          .insert({
            sheet_name: newSheet.sheet_name,
            assigned_to: newSheet.assigned_to,
            created_by: profile?.id,
            department: newSheet.department as any,
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;

        // Log activity
        await supabase.from('activity_logs').insert([{
          user_id: profile?.id,
          action: 'CREATE_SHEET',
          description: `Created purchase sheet "${newSheet.sheet_name}" for teacher`
        }]);

        toast({
          title: "Success",
          description: "Purchase sheet created successfully",
        });
      }

      setNewSheet({ sheet_name: '', assigned_to: '', department: '' });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleExportSheet = (sheet: any) => {
    // Create Excel template for teachers
    const template = [
      ['Book Name', 'Author', 'Edition', 'Quantity', 'Teacher Name'],
      ['', '', '', '', sheet.assigned_teacher?.full_name || ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Book Requests');

    // Download the file
    XLSX.writeFile(workbook, `${sheet.sheet_name}_template.xlsx`);
    
    toast({
      title: "Success",
      description: "Excel template downloaded successfully",
    });
  };

  const handleMoveToCompare = async (sheetId: string) => {
    try {
      // Get all book requests from this sheet
      const { data: requests, error } = await supabase
        .from('book_requests')
        .select('*')
        .eq('sheet_id', sheetId);

      if (error) throw error;

      if (!requests || requests.length === 0) {
        toast({
          title: "Error",
          description: "No book requests found in this sheet",
          variant: "destructive",
        });
        return;
      }

      // Update sheet status
      await supabase
        .from('purchase_sheets')
        .update({ status: 'comparing' })
        .eq('id', sheetId);

      // Log activity
      await supabase.from('activity_logs').insert([{
        user_id: profile?.id,
        action: 'MOVE_TO_COMPARE',
        description: `Moved ${requests.length} book requests to comparison phase`
      }]);

      toast({
        title: "Success",
        description: `${requests.length} book requests moved to comparison phase`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    
  };

  const handleSelectAllTeachers = (checked: boolean) => {
    if (checked) {
      setSelectedTeachers(teachers.map(t => t.id));
    } else {
      setSelectedTeachers([]);
    }
  };

  const handleTeacherSelect = (teacherId: string, checked: boolean) => {
    if (checked) {
      setSelectedTeachers(prev => [...prev, teacherId]);
    } else {
      setSelectedTeachers(prev => prev.filter(id => id !== teacherId));
    }
  };

  const consolidateRequests = async () => {
    if (selectedTeachers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one teacher",
        variant: "destructive",
      });
      return;
    }

    setConsolidating(true);
    try {
      // Get all book requests from selected teachers
      const { data: allRequests, error } = await supabase
        .from('book_requests')
        .select('*')
        .in('teacher_id', selectedTeachers)
        .eq('status', 'pending');

      if (error) throw error;

      if (!allRequests || allRequests.length === 0) {
        toast({
          title: "Error",
          description: "No pending book requests found from selected teachers",
          variant: "destructive",
        });
        setConsolidating(false);
        return;
      }

      // Remove duplicates based on book_name, author, and edition
      const uniqueRequests = allRequests.reduce((acc: any[], current) => {
        const existing = acc.find(item => 
          item.book_name.toLowerCase() === current.book_name.toLowerCase() &&
          item.author.toLowerCase() === current.author.toLowerCase() &&
          item.edition.toLowerCase() === current.edition.toLowerCase()
        );

        if (existing) {
          // Merge quantities and combine teacher names
          existing.quantity += current.quantity;
          if (!existing.teacher_name.includes(current.teacher_name)) {
            existing.teacher_name += `, ${current.teacher_name}`;
          }
        } else {
          acc.push({ ...current });
        }
        return acc;
      }, []);

      // Create consolidated sheet name
      const selectedTeacherNames = teachers
        .filter(t => selectedTeachers.includes(t.id))
        .map(t => t.full_name.split(' ')[0])
        .join(', ');
      
      const sheetName = `Consolidated Sheet - ${selectedTeacherNames} - ${new Date().toLocaleDateString()}`;

      // Create the consolidated purchase sheet
      const { data: sheet, error: sheetError } = await supabase
        .from('purchase_sheets')
        .insert({
          sheet_name: sheetName,
          created_by: profile?.id,
          department: 'consolidated' as any,
          status: 'pending'
        })
        .select()
        .single();

      if (sheetError) throw sheetError;

      // Add consolidated requests to the sheet
      const requestsToInsert = uniqueRequests.map(request => ({
        ...request,
        id: undefined, // Let database generate new ID
        sheet_id: sheet.id,
        status: 'pending'
      }));

      const { error: insertError } = await supabase
        .from('book_requests')
        .insert(requestsToInsert);

      if (insertError) throw insertError;

      // Log activity
      await supabase.from('activity_logs').insert([{
        user_id: profile?.id,
        action: 'CONSOLIDATE_REQUESTS',
        description: `Consolidated ${allRequests.length} requests into ${uniqueRequests.length} unique books from ${selectedTeachers.length} teachers`
      }]);

      toast({
        title: "Success",
        description: `Consolidated ${allRequests.length} requests into ${uniqueRequests.length} unique books`,
      });

      setSelectedTeachers([]);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setConsolidating(false);
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

  if (profile?.role !== 'admin') {
    return <div className="text-center">Access denied. Admin only.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create Purchase Sheet</h1>
        <p className="text-muted-foreground">
          Create and manage book purchase sheets for teachers
        </p>
      </div>

      {/* Create New Sheet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Purchase Sheet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSheet} className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="sheet_name">Sheet Name</Label>
              <Input
                id="sheet_name"
                value={newSheet.sheet_name}
                onChange={(e) => setNewSheet({ ...newSheet, sheet_name: e.target.value })}
                placeholder="e.g., CS Department Q1 2024"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assign to Teacher</Label>
              <Select
                value={newSheet.assigned_to}
                onValueChange={(value) => {
                  if (value === "all") {
                    setNewSheet({ 
                      ...newSheet, 
                      assigned_to: "all",
                      department: "all"
                    });
                  } else {
                    const teacher = teachers.find(t => t.id === value);
                    setNewSheet({ 
                      ...newSheet, 
                      assigned_to: value,
                      department: teacher?.department || ''
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Select All Teachers ({teachers.length})
                    </div>
                  </SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.full_name} ({teacher.department?.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={newSheet.department}
                onValueChange={(value) => setNewSheet({ ...newSheet, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
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

            <div className="md:col-span-3">
              <Button type="submit" disabled={loading}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Create Sheet
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Consolidate Teacher Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Consolidate Teacher Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedTeachers.length === teachers.length && teachers.length > 0}
                onCheckedChange={handleSelectAllTeachers}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                Select All Teachers ({teachers.length})
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={teacher.id}
                    checked={selectedTeachers.includes(teacher.id)}
                    onCheckedChange={(checked) => handleTeacherSelect(teacher.id, checked as boolean)}
                  />
                  <label htmlFor={teacher.id} className="text-sm">
                    {teacher.full_name} ({teacher.department?.replace('_', ' ')})
                  </label>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedTeachers.length} teachers selected
              </span>
              <Button
                onClick={consolidateRequests}
                disabled={consolidating || selectedTeachers.length === 0}
                className="flex items-center gap-2"
              >
                <CheckSquare className="h-4 w-4" />
                {consolidating ? 'Consolidating...' : 'Consolidate Requests'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Sheets */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Sheets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-40">Sheet Name</TableHead>
                  <TableHead className="min-w-32 hidden sm:table-cell">Assigned Teacher</TableHead>
                  <TableHead className="min-w-32 hidden md:table-cell">Department</TableHead>
                  <TableHead className="min-w-20">Status</TableHead>
                  <TableHead className="min-w-24 hidden lg:table-cell">Created</TableHead>
                  <TableHead className="min-w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheets.map((sheet) => (
                  <TableRow key={sheet.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{sheet.sheet_name}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {sheet.assigned_teacher?.full_name}
                        </div>
                        <div className="text-xs text-muted-foreground md:hidden capitalize">
                          {sheet.department?.replace('_', ' ')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{sheet.assigned_teacher?.full_name}</TableCell>
                    <TableCell className="capitalize hidden md:table-cell">
                      {sheet.department?.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        sheet.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        sheet.status === 'comparing' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {sheet.status}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {new Date(sheet.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportSheet(sheet)}
                          className="p-2"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {sheet.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleMoveToCompare(sheet.id)}
                            className="p-2"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {sheets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No purchase sheets created yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCreatePurchase;
