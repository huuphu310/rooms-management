Hotel Booking & Payment System – Requirements

1. Overview

System to manage hotel reservations, deposits, stays, in-stay consumptions, surcharges, discounts, early checkouts, and invoicing. Must consolidate all charges (planned and incidental) into a single folio and generate a final invoice.

⸻

2. Core Concepts
	•	Reservation: Guest booking with deposit policies and rate plan.
	•	Deposit: Prepayment or hold required to confirm booking.
	•	Stay: Actual check-in/out information.
	•	Folio: Ledger for financial postings.
	•	Posting: Each charge/credit entry.
	•	Invoice: Final summarized document.

⸻

3. Reservation Lifecycle
	1.	Draft
	2.	PendingDeposit
	3.	Confirmed
	4.	CheckedIn
	5.	CheckedOut
	6.	Cancelled / NoShow

⸻

4. Deposits
	•	Configurable policies (amount, expiry, type).
	•	States: HELD | CAPTURED | RELEASED | REFUNDED | EXPIRED.
	•	Applied into folio as credit.

⸻

5. Folio & Postings
	•	Folio groups all entries by reservation/stay.
	•	Posting types: ROOM | POS | SURCHARGE | DISCOUNT | TAX | DEPOSIT | PAYMENT | REFUND | ADJUSTMENT.

5.1 Surcharge & Discount Policies
	•	Seasonal / Holiday surcharge: Additional % or fixed amount based on date range or holiday calendar.
	•	Weekend surcharge: Rule applied to Fri–Sun nights (configurable).
	•	Extra person surcharge: Applied if occupancy > base occupancy of room type.
	•	Extra bed surcharge: Applied per additional bed requested.
	•	Service surcharge: For services like late check-out, early check-in, spa, amenities.
	•	Other surcharge (manual): Staff can add ad-hoc surcharges not in predefined categories.
	•	Room/Allotment discount: Percentage discount applied for certain room types or quota.
	•	Promotional discounts: Campaign or coupon-based, applied per night or per folio.

Each surcharge/discount must be stored as a posting with description, rule applied, and reference ID (policy/campaign/manual).

⸻

6. Check-Out Scenarios
	•	Normal: Post all room nights + surcharges/discounts.
	•	Early checkout: Remove unused nights, add early departure surcharge.

⸻

7. Invoicing

Invoice must include:
	•	Breakdown by line item (room charges, POS, surcharges, discounts, deposits, payments).
	•	Support multiple surcharge categories and manual additions.
	•	Show both subtotal (before tax) and final total (after tax).
	•	Immutable after finalization.

⸻

8. Scheduled Jobs
	•	Cancel expired deposits.
	•	Release expired holds.
	•	Night audit:
	•	Post room/night charges including seasonal/weekend surcharges.
	•	Apply extra person/bed charges.
	•	Sync POS bills.

⸻

9. Reporting
	•	Revenue by category (Room, POS, Surcharges, Discounts).
	•	Occupancy reports.
	•	Deposit aging.
	•	Outstanding balances.