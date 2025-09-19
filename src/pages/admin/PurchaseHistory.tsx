import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { History, Download, Calendar, Archive, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface PurchaseHistoryCycle {
  cycle_id: string;
  cycle_closed_at: string;
  sheet_name: string;
  total_purchases: number;
  total_amount: number;
  total_books: number;
}

interface HistoricalPurchase {
  id: string;
  cycle_id: string;
  shop_name: string;
  price_per_unit: number;
  total_amount: number;
  created_at: string;
  book_name: string;
  author: string;
  edition: string;
  quantity: number;
  teacher_name: string;
}

const AdminPurchaseHistory = () => {
  const { profile } = useAuthStore();
  const { toast } = useToast();
  const [historyCycles, setHistoryCycles] = useState<PurchaseHistoryCycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);
  const [cyclePurchases, setCyclePurchases] = useState<HistoricalPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  useEffect(() => {
    fetchHistoryCycles();
  }, []);

  const fetchHistoryCycles = async () => {
    try {
      // Get cycles with sheet names from purchase_history
      const { data, error } = await supabase
        .from('purchase_history')
        .select('cycle_id, cycle_closed_at, sheet_name, created_by')
        .order('cycle_closed_at', { ascending: false });

      if (error) throw error;

      // Get purchase totals for each cycle
      const cyclesWithTotals = await Promise.all(
        (data || []).map(async (cycle) => {
          const { data: purchases, error: purchaseError } = await supabase
            .from('finalized_purchases_history')
            .select('total_amount')
            .eq('cycle_id', cycle.cycle_id);

          if (purchaseError) throw purchaseError;

          const totalAmount = purchases?.reduce((sum, p) => sum + p.total_amount, 0) || 0;
          const totalPurchases = purchases?.length || 0;

          return {
            cycle_id: cycle.cycle_id,
            cycle_closed_at: cycle.cycle_closed_at,
            sheet_name: cycle.sheet_name,
            total_purchases: totalPurchases,
            total_amount: totalAmount,
            total_books: totalPurchases,
          };
        })
      );

      setHistoryCycles(cyclesWithTotals);
    } catch (error) {
      console.error('Error fetching history cycles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCyclePurchases = async (cycleId: string) => {
    setLoadingPurchases(true);
    try {
      const { data, error } = await supabase
        .from('finalized_purchases_history')
        .select('*')
        .eq('cycle_id', cycleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCyclePurchases(data || []);
      setSelectedCycle(cycleId);
    } catch (error) {
      console.error('Error fetching cycle purchases:', error);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const deleteCycle = async (cycleId: string) => {
    if (!confirm('Are you sure you want to delete this purchase cycle? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete from both history tables
      await supabase.from('finalized_purchases_history').delete().eq('cycle_id', cycleId);
      await supabase.from('book_requests_history').delete().eq('cycle_id', cycleId);
      await supabase.from('purchase_history').delete().eq('cycle_id', cycleId);
      
      // Refresh the data
      await fetchHistoryCycles();
      
      // Clear selected cycle if it was deleted
      if (selectedCycle === cycleId) {
        setSelectedCycle(null);
        setCyclePurchases([]);
      }

      toast({
        title: "Success",
        description: "Purchase cycle deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting cycle:', error);
      toast({
        title: "Error",
        description: "Failed to delete purchase cycle",
        variant: "destructive",
      });
    }
  };

  const exportCycleToExcel = (cycle: PurchaseHistoryCycle) => {
    const cycleData = cyclePurchases.filter(p => p.cycle_id === cycle.cycle_id);
    
    if (cycleData.length === 0) {
      toast({
        title: "Error",
        description: "No data to export for this cycle",
        variant: "destructive",
      });
      return;
    }

    const exportData = cycleData.map((purchase, index) => ({
      'S.No': index + 1,
      'Book Name': purchase.book_name,
      'Author': purchase.author,
      'Edition': purchase.edition,
      'Quantity': purchase.quantity,
      'Price per Unit': purchase.price_per_unit.toString(),
      'Total Amount': purchase.total_amount.toString(),
      'Shop Name': purchase.shop_name,
      'Requested By': purchase.teacher_name,
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
      'Total Amount': cycle.total_amount.toString(),
      'Shop Name': 'TOTAL',
      'Requested By': '',
      'Finalized Date': '',
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase History');

    const colWidths = [
      { wch: 8 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 10 },
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
    ];
    worksheet['!cols'] = colWidths;

    const fileName = `Purchase_History_${cycle.cycle_id.substring(0, 8)}_${new Date(cycle.cycle_closed_at).toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Success",
      description: "Purchase history exported successfully",
    });
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Purchase History</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            View closed purchase cycles and archived data
          </p>
        </div>
      </div>

      {/* Purchase Cycles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Closed Purchase Cycles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyCycles.length > 0 ? (
            <div className="grid gap-4">
              {historyCycles.map((cycle) => (
                <div
                  key={cycle.cycle_id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedCycle === cycle.cycle_id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => fetchCyclePurchases(cycle.cycle_id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-1" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-sm">
                            {cycle.sheet_name}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            Closed
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Closed on: {new Date(cycle.cycle_closed_at).toLocaleString()}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            <span className="font-medium text-foreground">{cycle.total_purchases}</span> purchases
                          </span>
                          <span className="text-muted-foreground">
                            Total: <span className="font-medium text-green-600">
                              ₹{cycle.total_amount.toLocaleString('en-IN')}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedCycle === cycle.cycle_id) {
                            exportCycleToExcel(cycle);
                          } else {
                            fetchCyclePurchases(cycle.cycle_id);
                          }
                        }}
                        disabled={loadingPurchases}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCycle(cycle.cycle_id);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No purchase history available</p>
              <p className="text-sm">Closed purchase cycles will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Purchase History */}
      {selectedCycle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {historyCycles.find(c => c.cycle_id === selectedCycle)?.sheet_name || 'Cycle Details'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPurchases ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : cyclePurchases.length > 0 ? (
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cyclePurchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{purchase.book_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {purchase.author} - {purchase.edition}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{purchase.quantity}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">₹{purchase.price_per_unit.toFixed(2)}</TableCell>
                        <TableCell className="font-medium text-sm">
                          ₹{purchase.total_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {purchase.shop_name}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{purchase.teacher_name}</TableCell>
                        <TableCell className="hidden xl:table-cell text-xs">
                          {new Date(purchase.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Total Row */}
                <div className="mt-4 p-4 bg-secondary rounded-lg border-t">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Cycle Total Amount:</span>
                    <span className="text-green-600">
                      ₹{cyclePurchases.reduce((sum, p) => sum + p.total_amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No purchases found for this cycle</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminPurchaseHistory;