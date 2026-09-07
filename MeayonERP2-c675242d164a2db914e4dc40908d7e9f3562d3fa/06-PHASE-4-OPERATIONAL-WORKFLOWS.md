Phase 3 is fully approved. The frontend authentication and protected routing are working perfectly. 

You are now authorized to execute **Phase 4: Operational Workflows & Saudi Commercial Readiness**. Our goal is to wire the core ERP business logic into our new Multi-Tenant UI and finalize our ZATCA/KSA compliance workflows.

Please execute the following in small, reviewable commits:

## 1. ZATCA & Financial UI Integration
* Connect the frontend Invoice and Voucher screens to the backend accounting endpoints.
* Ensure the UI correctly displays the ZATCA Phase 1 QR code (Base64 TLV) on printed invoices.
* Implement Arabic "Tafqeet" (Number-to-Word conversion) on the frontend or backend so that all finalized invoices and vouchers display the legal text (e.g., "فقط لا غير...").
* Ensure all currency formatting defaults strictly to SAR (Saudi Riyal) with 2 decimal places.

## 2. Logistics & Weighbridge Flow
* Wire up the frontend components for the core operational loop: `Trips -> Weighbridge Tickets -> Proof of Delivery`.
* Ensure that creating a Weighbridge Ticket correctly triggers the backend `stock_pickings` API to update inventory/materials in real-time.

## 3. Granular RBAC (Role-Based Access Control) Enforcement
* Update the frontend UI to hide or disable buttons based on the user's decoded JWT role (`admin`, `user`, `guest_user`).
* Ensure that only an `admin` can approve a Payment Voucher (PV) or Receipt Voucher (RV).
* Ensure `guest_user` accounts have read-only access strictly limited to their assigned trips or tickets.

## 4. End-to-End Verification
* Run a complete End-to-End (E2E) workflow test: Log in as a tenant, create a Trip, log a Weighbridge Ticket, generate an Invoice, and verify the ZATCA QR code renders correctly.
* Ensure no data leaks across the Control Plane or other tenants during this process.

Report back with a summary of the UI components updated, the ZATCA integration status, and the results of the E2E workflow test.