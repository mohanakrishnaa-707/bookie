import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { CheckSquare, Download, Calculator, Archive, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FinalizedPurchase {
  id: string;
  shop_name: string;
  price_per_unit: number;
  total_amount: number;
  created_at: string;
  book_request: {
    book_name: string;
    author: string;
    edition: string;
    quantity: number;
    teacher_name: string;
  };
}

const AdminFinalize = () => {
  const { profile } = useAuthStore();
  const { toast } = useToast();
  const [finalizedPurchases, setFinalizedPurchases] = useState<FinalizedPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingPurchases, setClosingPurchases] = useState(false);

  useEffect(() => {
    fetchFinalizedPurchases();
  }, []);

  const fetchFinalizedPurchases = async () => {
    try {
      // Get sheets that are currently active (pending or comparing)
      // Completed sheets should still show their finalized purchases until cycle is closed
      const { data: activeSheets } = await supabase
        .from('purchase_sheets')
        .select('id, status')
        .in('status', ['pending', 'comparing', 'completed']);

      if (!activeSheets || activeSheets.length === 0) {
        setFinalizedPurchases([]);
        setLoading(false);
        return;
      }

      // Get active sheet IDs
      const activeSheetIds = activeSheets.map(sheet => sheet.id);

      // Fetch finalized purchases with their book requests, but only for active sheets
      const { data, error } = await supabase
        .from('finalized_purchases')
        .select(`
          *,
          book_request:book_request_id!inner (
            book_name,
            author,
            edition,
            quantity,
            teacher_name,
            sheet_id
          )
        `)
        .in('book_request.sheet_id', activeSheetIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setFinalizedPurchases(data || []);
    } catch (error) {
      console.error('Error fetching finalized purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const movePurchaseBack = async (purchaseId: string) => {
    try {
      // Get the finalized purchase details
      const { data: purchase, error: fetchError } = await supabase
        .from('finalized_purchases')
        .select(`
          *,
          book_request:book_request_id (*)
        `)
        .eq('id', purchaseId)
        .single();

      if (fetchError) throw fetchError;

      // Create price comparison record to move it back
      await supabase
        .from('price_comparisons')
        .insert({
          book_request_id: purchase.book_request_id,
          shop_name: purchase.shop_name,
          price: purchase.price_per_unit,
          is_selected: false
        });

      // Delete from finalized purchases
      await supabase
        .from('finalized_purchases')
        .delete()
        .eq('id', purchaseId);

      // Update sheet status back to comparing
      if (purchase.book_request?.sheet_id) {
        await supabase
          .from('purchase_sheets')
          .update({ status: 'comparing' })
          .eq('id', purchase.book_request.sheet_id);
      }

      // Log activity
      await supabase.from('activity_logs').insert([{
        user_id: profile?.id,
        action: 'MOVE_PURCHASE_BACK',
        description: `Moved purchase "${purchase.book_request?.book_name}" back to comparison phase`
      }]);

      toast({
        title: "Success",
        description: "Purchase moved back to comparison phase",
      });

      fetchFinalizedPurchases();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTotalAmount = () => {
    return finalizedPurchases.reduce((sum, purchase) => sum + purchase.total_amount, 0);
  };

  const exportToExcel = () => {
    if (finalizedPurchases.length === 0) {
      toast({
        title: "Error",
        description: "No finalized purchases to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = finalizedPurchases.map((purchase, index) => ({
      'S.No': index + 1,
      'Book Name': purchase.book_request.book_name,
      'Author': purchase.book_request.author,
      'Edition': purchase.book_request.edition,
      'Quantity': purchase.book_request.quantity,
      'Price per Unit': purchase.price_per_unit.toString(),
      'Total Amount': purchase.total_amount.toString(),
      'Shop Name': purchase.shop_name,
      'Requested By': purchase.book_request.teacher_name,
      'Finalized Date': new Date(purchase.created_at).toLocaleDateString(),
    }));

    // Add total row
    exportData.push({
      'S.No': '' as any,
      'Book Name': '',
      'Author': '',
      'Edition': '',
      'Quantity': '' as any,
      'Price per Unit': '',
      'Total Amount': getTotalAmount().toString(),
      'Shop Name': 'TOTAL',
      'Requested By': '',
      'Finalized Date': '',
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Finalized Purchases');

    // Style the header row
    const headerRow = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']).s.r : 0;
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Auto-width columns
    const colWidths = [
      { wch: 8 },   // S.No
      { wch: 30 },  // Book Name
      { wch: 20 },  // Author
      { wch: 15 },  // Edition
      { wch: 10 },  // Quantity
      { wch: 15 },  // Price per Unit
      { wch: 15 },  // Total Amount
      { wch: 20 },  // Shop Name
      { wch: 20 },  // Requested By
      { wch: 15 },  // Finalized Date
    ];
    worksheet['!cols'] = colWidths;

    const fileName = `Finalized_Purchases_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Success",
      description: "Finalized purchases exported successfully",
    });
  };

  const exportCSV = () => {
    if (finalizedPurchases.length === 0) {
      toast({
        title: "Error",
        description: "No finalized purchases to export",
        variant: "destructive",
      });
      return;
    }

    const csvData = finalizedPurchases.map((purchase, index) => [
      index + 1,
      purchase.book_request.book_name,
      purchase.book_request.author,
      purchase.book_request.edition,
      purchase.book_request.quantity,
      purchase.price_per_unit,
      purchase.total_amount,
      purchase.shop_name,
      purchase.book_request.teacher_name,
      new Date(purchase.created_at).toLocaleDateString(),
    ]);

    // Add header row
    csvData.unshift([
      'S.No', 'Book Name', 'Author', 'Edition', 'Quantity', 
      'Price per Unit', 'Total Amount', 'Shop Name', 'Requested By', 'Finalized Date'
    ]);

    // Add total row
    csvData.push([
      '', '', '', '', '', '', getTotalAmount(), 'TOTAL', '', ''
    ]);

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Finalized_Purchases_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Finalized purchases exported as CSV",
    });
  };

  const closePurchases = async () => {
    setClosingPurchases(true);
    try {
      // Generate a unique cycle ID for this purchase cycle
      const cycleId = crypto.randomUUID();

      // First, get all current finalized purchases with their book requests
      const { data: purchases, error: fetchError } = await supabase
        .from('finalized_purchases')
        .select(`
          *,
          book_request:book_request_id (
            *
          )
        `);

      if (fetchError) throw fetchError;

      // Get all current book requests
      const { data: allBookRequests, error: bookFetchError } = await supabase
        .from('book_requests')
        .select('*');

      if (bookFetchError) throw bookFetchError;

      // Get all current purchase sheets
      const { data: allSheets, error: sheetFetchError } = await supabase
        .from('purchase_sheets')
        .select('*');

      if (sheetFetchError) throw sheetFetchError;

      // Move data to history tables in parallel
      const historyPromises = [];

      // Move finalized purchases to history
      if (purchases && purchases.length > 0) {
        const purchaseHistoryData = purchases.map(purchase => ({
          cycle_id: cycleId,
          original_purchase_id: purchase.id,
          original_book_request_id: purchase.book_request_id,
          shop_name: purchase.shop_name,
          price_per_unit: purchase.price_per_unit,
          total_amount: purchase.total_amount,
          finalized_by: purchase.finalized_by,
          book_name: purchase.book_request.book_name,
          author: purchase.book_request.author,
          edition: purchase.book_request.edition,
          quantity: purchase.book_request.quantity,
          teacher_name: purchase.book_request.teacher_name,
        }));

        historyPromises.push(
          supabase
            .from('finalized_purchases_history')
            .insert(purchaseHistoryData)
        );
      }

      // Move book requests to history
      if (allBookRequests && allBookRequests.length > 0) {
        const bookHistoryData = allBookRequests.map(request => ({
          cycle_id: cycleId,
          original_request_id: request.id,
          book_name: request.book_name,
          author: request.author,
          edition: request.edition,
          quantity: request.quantity,
          teacher_name: request.teacher_name,
          teacher_id: request.teacher_id,
          status: request.status,
        }));

        historyPromises.push(
          supabase
            .from('book_requests_history')
            .insert(bookHistoryData)
        );
      }

      // Move purchase sheets to history
      if (allSheets && allSheets.length > 0) {
        const sheetHistoryData = allSheets.map(sheet => ({
          cycle_id: cycleId,
          original_sheet_id: sheet.id,
          sheet_name: sheet.sheet_name,
          department: sheet.department,
          created_by: sheet.created_by,
          assigned_to: sheet.assigned_to,
          status: sheet.status,
          cycle_closed_by: profile?.id,
        }));

        historyPromises.push(
          supabase
            .from('purchase_history')
            .insert(sheetHistoryData)
        );
      }

      // Execute all history insertions
      await Promise.all(historyPromises);

      // Clear all current data safely using explicit id lists
      const purchaseIds = (purchases || []).map(p => p.id);
      const requestIds = (allBookRequests || []).map(r => r.id);
      const sheetIds = (allSheets || []).map(s => s.id);

      await Promise.all([
        purchaseIds.length ? supabase.from('finalized_purchases').delete().in('id', purchaseIds) : Promise.resolve(),
        requestIds.length ? supabase.from('price_comparisons').delete().in('book_request_id', requestIds) : Promise.resolve(),
        requestIds.length ? supabase.from('book_requests').delete().in('id', requestIds) : Promise.resolve(),
        sheetIds.length ? supabase.from('purchase_sheets').delete().in('id', sheetIds) : Promise.resolve(),
      ]);

      // Log activity
      await supabase.from('activity_logs').insert([{
        user_id: profile?.id,
        action: 'CLOSE_PURCHASE_CYCLE',
        description: `Closed purchase cycle and moved ${purchases?.length || 0} purchases to history`
      }]);

      toast({
        title: "Success",
        description: "Purchase cycle closed successfully. All data moved to history.",
      });

      // Refresh the page data
      fetchFinalizedPurchases();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setClosingPurchases(false);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Finalized Purchases</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Review and export finalized book purchase decisions
          </p>
        </div>
        
        <div className="flex gap-2 flex-col sm:flex-row w-full lg:w-auto">
          {finalizedPurchases.length > 0 && (
            <>
              <Button variant="outline" onClick={exportCSV} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={exportToExcel} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </>
          )}
          <Button 
            variant="destructive" 
            onClick={closePurchases} 
            disabled={closingPurchases}
            className="w-full sm:w-auto"
          >
            <Archive className="mr-2 h-4 w-4" />
            {closingPurchases ? 'Closing...' : 'Close Purchases'}
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Purchase Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {finalizedPurchases.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Books</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ₹{getTotalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {new Set(finalizedPurchases.map(p => p.shop_name)).size}
              </div>
              <div className="text-sm text-muted-foreground">Shops Involved</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finalized Purchases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Finalized Purchase List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {finalizedPurchases.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-48">Book Details</TableHead>
                    <TableHead className="min-w-16">Qty</TableHead>
                    <TableHead className="min-w-20 hidden sm:table-cell">Price/Unit</TableHead>
                    <TableHead className="min-w-20">Total</TableHead>
                    <TableHead className="min-w-24 hidden md:table-cell">Shop</TableHead>
                    <TableHead className="min-w-28 hidden lg:table-cell">Requested By</TableHead>
                    <TableHead className="min-w-20 hidden xl:table-cell">Date</TableHead>
                    <TableHead className="min-w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finalizedPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{purchase.book_request.book_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {purchase.book_request.author} - {purchase.book_request.edition}
                          </div>
                          <div className="text-xs text-muted-foreground sm:hidden">
                            ₹{purchase.price_per_unit.toFixed(2)} × {purchase.book_request.quantity}
                          </div>
                          <div className="text-xs text-muted-foreground md:hidden">
                            {purchase.shop_name}
                          </div>
                          <div className="text-xs text-muted-foreground lg:hidden">
                            By: {purchase.book_request.teacher_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{purchase.book_request.quantity}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">₹{purchase.price_per_unit.toFixed(2)}</TableCell>
                      <TableCell className="font-medium text-sm">
                        ₹{purchase.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {purchase.shop_name}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{purchase.book_request.teacher_name}</TableCell>
                      <TableCell className="hidden xl:table-cell text-xs">
                        {new Date(purchase.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => movePurchaseBack(purchase.id)}
                          className="p-2"
                          title="Move back to comparison phase"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Total Row */}
              <div className="mt-4 p-4 bg-secondary rounded-lg border-t">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Purchase Amount:</span>
                  <span className="text-green-600">
                    ₹{getTotalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No finalized purchases yet</p>
              <p className="text-sm">Complete the price comparison process to see finalized purchases here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFinalize;