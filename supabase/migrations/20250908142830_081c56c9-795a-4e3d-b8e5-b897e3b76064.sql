-- Clean up orphaned finalized purchases that belong to completed/closed cycles
-- These are purchases whose book requests don't exist or belong to sheets that should be considered closed

DELETE FROM finalized_purchases 
WHERE book_request_id NOT IN (
  SELECT br.id FROM book_requests br 
  INNER JOIN purchase_sheets ps ON br.sheet_id = ps.id 
  WHERE ps.status IN ('pending', 'comparing', 'completed')
);

-- Also clean up any price comparisons for requests that no longer exist
DELETE FROM price_comparisons 
WHERE book_request_id NOT IN (
  SELECT br.id FROM book_requests br 
  INNER JOIN purchase_sheets ps ON br.sheet_id = ps.id 
  WHERE ps.status IN ('pending', 'comparing', 'completed')
);