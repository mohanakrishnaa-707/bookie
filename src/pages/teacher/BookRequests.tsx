import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Plus, Download, Edit, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BookRequest {
  id: string;
  book_name: string;
  author: string;
  edition: string;
  quantity: number;
  status: string;
  created_at: string;
  sheet_id?: string;
}

interface PurchaseSheet {
  id: string;
  sheet_name: string;
  status: string;
  created_at: string;
}

const TeacherBookRequests = () => {
  const { profile } = useAuthStore();
  const { toast } = useToast();
  const [bookRequests, setBookRequests] = useState<BookRequest[]>([]);
  const [purchaseSheets, setPurchaseSheets] = useState<PurchaseSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [editingRequest, setEditingRequest] = useState<BookRequest | null>(null);
  const [loading, setLoading] = useState(false);

  const [newRequest, setNewRequest] = useState({
    book_name: '',
    author: '',
    edition: '',
    quantity: 1,
  });

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    try {
      const [requestsResponse, sheetsResponse] = await Promise.all([
        supabase
          .from('book_requests')
          .select('*')
          .eq('teacher_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('purchase_sheets')
          .select('*')
          .eq('assigned_to', profile.id)
          .order('created_at', { ascending: false })
      ]);

      if (requestsResponse.data) setBookRequests(requestsResponse.data);
      if (sheetsResponse.data) setPurchaseSheets(sheetsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRequest.book_name || !newRequest.author || !newRequest.edition || !profile) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSheet) {
      toast({
        title: "Error",
        description: "Please select a purchase sheet",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('book_requests')
        .insert([{
          ...newRequest,
          sheet_id: selectedSheet,
          teacher_id: profile.id,
          teacher_name: profile.full_name,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Book request added successfully",
      });

      setNewRequest({ book_name: '', author: '', edition: '', quantity: 1 });
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

  const handleUpdateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingRequest) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('book_requests')
        .update({
          book_name: editingRequest.book_name,
          author: editingRequest.author,
          edition: editingRequest.edition,
          quantity: editingRequest.quantity,
        })
        .eq('id', editingRequest.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Book request updated successfully",
      });

      setEditingRequest(null);
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

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      const { error } = await supabase
        .from('book_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Book request deleted successfully",
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

  const exportRequests = () => {
    if (bookRequests.length === 0) {
      toast({
        title: "Error",
        description: "No book requests to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = bookRequests.map((request, index) => ({
      'S.No': index + 1,
      'Book Name': request.book_name,
      'Author': request.author,
      'Edition': request.edition,
      'Quantity': request.quantity,
      'Status': request.status,
      'Requested Date': new Date(request.created_at).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Book Requests');

    // Auto-width columns
    const colWidths = [
      { wch: 8 },   // S.No
      { wch: 30 },  // Book Name
      { wch: 20 },  // Author
      { wch: 15 },  // Edition
      { wch: 10 },  // Quantity
      { wch: 15 },  // Status
      { wch: 15 },  // Date
    ];
    worksheet['!cols'] = colWidths;

    const fileName = `My_Book_Requests_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Success",
      description: "Book requests exported successfully",
    });
  };

  if (profile?.role !== 'teacher') {
    return <div className="text-center">Access denied. Teachers only.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Book Requests</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your book purchase requests and submissions
          </p>
        </div>
        
        {bookRequests.length > 0 && (
          <Button variant="outline" onClick={exportRequests} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export Requests
          </Button>
        )}
      </div>

      {/* Available Purchase Sheets */}
      {purchaseSheets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Purchase Sheets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {purchaseSheets.map((sheet) => (
                <div 
                  key={sheet.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedSheet === sheet.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedSheet(sheet.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{sheet.sheet_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(sheet.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      sheet.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      sheet.status === 'comparing' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {sheet.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Book Request */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editingRequest ? 'Edit Book Request' : 'Add New Book Request'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={editingRequest ? handleUpdateRequest : handleAddRequest} className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="book_name">Book Name</Label>
              <Input
                id="book_name"
                value={editingRequest ? editingRequest.book_name : newRequest.book_name}
                onChange={(e) => editingRequest 
                  ? setEditingRequest({ ...editingRequest, book_name: e.target.value })
                  : setNewRequest({ ...newRequest, book_name: e.target.value })
                }
                placeholder="Enter book name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={editingRequest ? editingRequest.author : newRequest.author}
                onChange={(e) => editingRequest
                  ? setEditingRequest({ ...editingRequest, author: e.target.value })
                  : setNewRequest({ ...newRequest, author: e.target.value })
                }
                placeholder="Enter author name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edition">Edition</Label>
              <Input
                id="edition"
                value={editingRequest ? editingRequest.edition : newRequest.edition}
                onChange={(e) => editingRequest
                  ? setEditingRequest({ ...editingRequest, edition: e.target.value })
                  : setNewRequest({ ...newRequest, edition: e.target.value })
                }
                placeholder="Enter edition"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={editingRequest ? editingRequest.quantity : newRequest.quantity}
                onChange={(e) => {
                  const quantity = parseInt(e.target.value) || 1;
                  editingRequest
                    ? setEditingRequest({ ...editingRequest, quantity })
                    : setNewRequest({ ...newRequest, quantity });
                }}
                required
              />
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={loading || (!editingRequest && !selectedSheet)}>
                <BookOpen className="mr-2 h-4 w-4" />
                {editingRequest ? 'Update Request' : 'Add Request'}
              </Button>
              {editingRequest && (
                <Button type="button" variant="outline" onClick={() => setEditingRequest(null)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Book Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            My Book Requests ({bookRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-48">Book Details</TableHead>
                    <TableHead className="min-w-16">Qty</TableHead>
                    <TableHead className="min-w-20 hidden sm:table-cell">Status</TableHead>
                    <TableHead className="min-w-24 hidden md:table-cell">Date</TableHead>
                    <TableHead className="min-w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{request.book_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {request.author} - {request.edition}
                          </div>
                          <div className="text-xs text-muted-foreground sm:hidden">
                            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                              request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              request.status === 'approved' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status}
                            </span>
                            <span className="ml-2 md:hidden">
                              {new Date(request.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{request.quantity}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingRequest(request)}
                            className="p-2"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteRequest(request.id)}
                            className="p-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No book requests yet</p>
              <p className="text-sm">Add your first book request above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherBookRequests;