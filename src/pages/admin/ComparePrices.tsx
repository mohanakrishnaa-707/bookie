import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Plus, Check, ArrowRight, CheckSquare } from 'lucide-react';

interface BookRequest {
  id: string;
  book_name: string;
  author: string;
  edition: string;
  quantity: number;
  teacher_name: string;
}

interface PriceComparison {
  shop_name: string;
  price: number;
}

const AdminComparePrices = () => {
  const { profile } = useAuthStore();
  const { toast } = useToast();
  const [bookRequests, setBookRequests] = useState<BookRequest[]>([]);
  const [shops, setShops] = useState<string[]>([]);
  const [prices, setPrices] = useState<{ [key: string]: { [shop: string]: number } }>({});
  const [newShop, setNewShop] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetchBookRequests();
  }, []);

  const fetchBookRequests = async () => {
    try {
      // Get book requests from sheets that are in comparing status
      const { data: sheets } = await supabase
        .from('purchase_sheets')
        .select('id')
        .eq('status', 'comparing');

      if (!sheets?.length) return;

      const sheetIds = sheets.map(s => s.id);
      const { data: requests, error } = await supabase
        .from('book_requests')
        .select('*')
        .in('sheet_id', sheetIds);

      if (error) throw error;

      setBookRequests(requests || []);

      // Fetch existing price comparisons
      const { data: comparisons } = await supabase
        .from('price_comparisons')
        .select('*')
        .in('book_request_id', (requests || []).map(r => r.id));

      // Organize comparisons by book and shop
      const priceData: { [key: string]: { [shop: string]: number } } = {};
      const shopSet = new Set<string>();

      comparisons?.forEach(comp => {
        if (!priceData[comp.book_request_id]) {
          priceData[comp.book_request_id] = {};
        }
        priceData[comp.book_request_id][comp.shop_name] = comp.price;
        shopSet.add(comp.shop_name);
      });

      setPrices(priceData);
      if (shopSet.size > 0) {
        setShops(Array.from(shopSet));
      }
    } catch (error) {
      console.error('Error fetching book requests:', error);
    }
  };

  const addShop = () => {
    if (newShop.trim() && !shops.includes(newShop.trim())) {
      setShops([...shops, newShop.trim()]);
      setNewShop('');
    }
  };

  const updatePrice = (bookId: string, shop: string, price: number) => {
    setPrices(prev => ({
      ...prev,
      [bookId]: {
        ...prev[bookId],
        [shop]: price
      }
    }));
  };

  const getMinPrice = (bookId: string) => {
    const bookPrices = prices[bookId] || {};
    const priceValues = Object.values(bookPrices).filter(p => p > 0);
    return priceValues.length > 0 ? Math.min(...priceValues) : 0;
  };

  const getMinPriceShop = (bookId: string) => {
    const bookPrices = prices[bookId] || {};
    const minPrice = getMinPrice(bookId);
    if (minPrice === 0) return '';
    
    return Object.entries(bookPrices).find(([shop, price]) => price === minPrice)?.[0] || '';
  };

  const savePrices = async () => {
    setLoading(true);
    try {
      // Delete existing comparisons for these books
      const bookIds = bookRequests.map(r => r.id);
      await supabase
        .from('price_comparisons')
        .delete()
        .in('book_request_id', bookIds);

      // Insert new comparisons
      const comparisons = [];
      for (const bookId of Object.keys(prices)) {
        for (const [shop, price] of Object.entries(prices[bookId])) {
          if (price > 0) {
            comparisons.push({
              book_request_id: bookId,
              shop_name: shop,
              price: price,
              is_selected: price === getMinPrice(bookId)
            });
          }
        }
      }

      if (comparisons.length > 0) {
        const { error } = await supabase
          .from('price_comparisons')
          .insert(comparisons);

        if (error) throw error;
      }

      // Log activity
      await supabase.from('activity_logs').insert([{
        user_id: profile?.id,
        action: 'UPDATE_PRICES',
        description: `Updated prices for ${bookRequests.length} books across ${shops.length} shops`
      }]);

      toast({
        title: "Success",
        description: "Prices saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleSelectAllBooks = (checked: boolean | string) => {
    const isChecked = !!checked;
    setSelectAll(isChecked);
    if (isChecked) {
      setSelectedBooks(new Set(bookRequests.map(book => book.id)));
    } else {
      setSelectedBooks(new Set());
    }
  };

  const handleSelectBook = (bookId: string, checked: boolean) => {
    const newSelected = new Set(selectedBooks);
    if (checked) {
      newSelected.add(bookId);
    } else {
      newSelected.delete(bookId);
    }
    setSelectedBooks(newSelected);
    setSelectAll(newSelected.size === bookRequests.length);
  };

  const finalizeSelectedComparisons = async () => {
    if (selectedBooks.size === 0) {
      toast({
        title: "Error",
        description: "No books selected for finalization",
        variant: "destructive",
      });
      return;
    }

    const selectedBooksList = bookRequests.filter(book => selectedBooks.has(book.id));

    try {
      // For each selected book, find the minimum price and create finalized purchase
      for (const book of selectedBooksList) {
        const minPrice = getMinPrice(book.id);
        const minShop = getMinPriceShop(book.id);

        if (minPrice && minShop) {
          // Insert into finalized_purchases
          await supabase
            .from('finalized_purchases')
            .insert({
              book_request_id: book.id,
              shop_name: minShop,
              price_per_unit: minPrice,
              total_amount: minPrice * book.quantity,
              finalized_by: profile?.id
            });
        }
      }

      // Log activity
      await supabase.from('activity_logs').insert([{
        user_id: profile?.id,
        action: 'FINALIZE_SELECTED_COMPARISON',
        description: `Finalized comparison for ${selectedBooks.size} selected books`
      }]);

      toast({
        title: "Success",
        description: `${selectedBooks.size} book comparisons finalized successfully`,
      });

      // Reset selections
      setSelectedBooks(new Set());
      setSelectAll(false);

      // Refresh data
      fetchBookRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const finalizeComparison = async () => {
    try {
      // Move selected books to finalized purchases
      const finalizedBooks = [];
      
      for (const book of bookRequests) {
        const minPrice = getMinPrice(book.id);
        const minPriceShop = getMinPriceShop(book.id);
        
        if (minPrice > 0 && minPriceShop) {
          finalizedBooks.push({
            book_request_id: book.id,
            shop_name: minPriceShop,
            price_per_unit: minPrice,
            total_amount: minPrice * book.quantity,
            finalized_by: profile?.id
          });
        }
      }

      if (finalizedBooks.length === 0) {
        toast({
          title: "Error",
          description: "No books with valid prices to finalize",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('finalized_purchases')
        .insert(finalizedBooks);

      if (error) throw error;

      // Update sheet status to completed
      const { data: sheets } = await supabase
        .from('purchase_sheets')
        .select('id')
        .eq('status', 'comparing');

      if (sheets?.length) {
        await supabase
          .from('purchase_sheets')
          .update({ status: 'completed' })
          .in('id', sheets.map(s => s.id));
      }

      // Log activity
      await supabase.from('activity_logs').insert([{
        user_id: profile?.id,
        action: 'FINALIZE_COMPARISON',
        description: `Finalized ${finalizedBooks.length} book purchases`
      }]);

      toast({
        title: "Success",
        description: `${finalizedBooks.length} books finalized for purchase`,
      });

      fetchBookRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (profile?.role !== 'admin') {
    return <div className="text-center">Access denied. Admin only.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Compare Prices</h1>
        <p className="text-muted-foreground">
          Compare book prices across different shops and select the best options
        </p>
      </div>

      {/* Add Shops */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Manage Shops
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4 flex-col sm:flex-row">
            <Input
              value={newShop}
              onChange={(e) => setNewShop(e.target.value)}
              placeholder="Enter shop name"
              onKeyPress={(e) => e.key === 'Enter' && addShop()}
              className="flex-1"
            />
            <Button onClick={addShop} className="w-full sm:w-auto">Add Shop</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {shops.map((shop, index) => (
              <span key={index} className="px-3 py-1 bg-secondary rounded-full text-sm">
                {shop}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Price Comparison Table */}
      {bookRequests.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Price Comparison
              </span>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-books"
                    checked={selectAll}
                    onCheckedChange={handleSelectAllBooks}
                  />
                  <Label htmlFor="select-all-books" className="text-sm font-medium">
                    Select All ({selectedBooks.size}/{bookRequests.length})
                  </Label>
                </div>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <Button onClick={savePrices} disabled={loading} className="w-full sm:w-auto">
                    <Check className="mr-2 h-4 w-4" />
                    Save Prices
                  </Button>
                  <Button 
                    onClick={finalizeSelectedComparisons} 
                    disabled={selectedBooks.size === 0}
                    className="w-full sm:w-auto"
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Finalize Selected ({selectedBooks.size})
                  </Button>
                  <Button onClick={finalizeComparison} className="w-full sm:w-auto">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Finalize All
                  </Button>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleSelectAllBooks}
                      />
                    </TableHead>
                    <TableHead className="min-w-48">Book Details</TableHead>
                    <TableHead className="min-w-16">Qty</TableHead>
                    {shops.map(shop => (
                      <TableHead key={shop} className="min-w-20 text-xs">{shop}</TableHead>
                    ))}
                    <TableHead className="min-w-20 hidden sm:table-cell">Best Price</TableHead>
                    <TableHead className="min-w-20 hidden md:table-cell">Best Shop</TableHead>
                    <TableHead className="min-w-24">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookRequests.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedBooks.has(book.id)}
                          onCheckedChange={(checked) => handleSelectBook(book.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{book.book_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {book.author} - {book.edition}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            By: {book.teacher_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{book.quantity}</TableCell>
                      {shops.map(shop => (
                        <TableCell key={shop}>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={prices[book.id]?.[shop] || ''}
                            onChange={(e) => updatePrice(book.id, shop, parseFloat(e.target.value) || 0)}
                            placeholder="₹"
                            className="w-16 text-xs"
                          />
                        </TableCell>
                      ))}
                      <TableCell className="font-medium text-green-600 text-sm hidden sm:table-cell">
                        ₹{getMinPrice(book.id).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-medium text-xs hidden md:table-cell">
                        {getMinPriceShop(book.id)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        <div>
                          <div>₹{(getMinPrice(book.id) * book.quantity).toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground sm:hidden">
                            {getMinPriceShop(book.id)} @ ₹{getMinPrice(book.id).toFixed(2)}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 p-4 bg-secondary rounded-lg">
              <div className="text-lg font-semibold">
                Total Estimated Cost: ₹{bookRequests.reduce((total, book) => 
                  total + (getMinPrice(book.id) * book.quantity), 0
                ).toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No books available for price comparison. 
              Create purchase sheets and move them to comparison phase first.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminComparePrices;