-- Clean up any finalized purchases and related data that belong to already closed (archived) sheets
-- A sheet is considered closed if it exists in purchase_history.original_sheet_id

-- 1) Remove finalized purchases for closed sheets
DELETE FROM public.finalized_purchases fp
USING public.book_requests br
WHERE fp.book_request_id = br.id
  AND br.sheet_id IN (
    SELECT ph.original_sheet_id FROM public.purchase_history ph
  );

-- 2) Remove price comparison rows linked to those closed sheets
DELETE FROM public.price_comparisons pc
USING public.book_requests br
WHERE pc.book_request_id = br.id
  AND br.sheet_id IN (
    SELECT ph.original_sheet_id FROM public.purchase_history ph
  );

-- 3) Remove book requests for closed sheets
DELETE FROM public.book_requests br
WHERE br.sheet_id IN (
  SELECT ph.original_sheet_id FROM public.purchase_history ph
);

-- 4) Remove closed sheets themselves from active table
DELETE FROM public.purchase_sheets ps
WHERE ps.id IN (
  SELECT ph.original_sheet_id FROM public.purchase_history ph
);