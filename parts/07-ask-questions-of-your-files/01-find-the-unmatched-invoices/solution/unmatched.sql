-- An invoice is matched when it bills the first time for its purchase order,
-- at the agreed price, for the quantity ordered. This lists every other invoice.
WITH bills AS (
  SELECT
    *,
    row_number() OVER (PARTITION BY po ORDER BY invoice_date, invoice) AS bill_number
  FROM read_csv('invoices.csv')
)
SELECT
  bills.invoice,
  bills.po,
  CASE
    WHEN bills.bill_number > 1 THEN 'duplicate'
    WHEN bills.unit_price <> orders.agreed_price THEN 'price above PO'
    ELSE 'short delivery'
  END AS reason
FROM bills
JOIN read_csv('purchase-orders.csv') AS orders ON orders.po_number = bills.po
WHERE bills.bill_number > 1
  OR bills.unit_price <> orders.agreed_price
  OR bills.quantity <> orders.quantity
ORDER BY bills.invoice;
