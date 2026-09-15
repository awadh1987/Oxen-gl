// ====================================================================
// OxenGL Enterprise Frontend Core Domain Type Registry
// Purpose: Explicit interface contracts supporting strict compile-time
//          type-safety across Phase 1 and Phase 2 application modules.
// ====================================================================

// --------------------------------------------------------------------
// 1. IDENTITY & SECURITY BOUNDARIES (IAM)
// --------------------------------------------------------------------
export interface UserProfile {
    id: string;
    tenantId: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'LOCKED' | 'DISABLED';
    mfaEnabled: boolean;
    roles: string[];
}

export interface AuthState {
    user: UserProfile | null;
    accessToken: string | null;
    refreshToken: string | null;
    isMfaRequired: boolean;
    challengeToken: string | null;
    isLoading: boolean;
    error: string | null;
}

export interface ABACUserContext {
    userId: string;
    tenantId: string;
    allowedCompanyIds: string[];
    allowedWarehouseIds: string[];
    allowedFleetRegions: string[];
    isSuperAdmin: boolean;
}

// --------------------------------------------------------------------
// 2. PROCUREMENT & SOURCE-TO-PAY (S2P) DOMAIN
// --------------------------------------------------------------------
export interface Vendor {
    id: string;
    code: string;
    name: string;
    taxNumber: string;
    country: string;
    currency: string;
    overallScore: number;
}

export interface ProcurementItemLine {
    materialId: string;
    materialCode: string;
    description: string;
    quantity: number;
    primaryUom: string;
    secondaryQuantity?: number;
    secondaryUom?: string;
    unitPrice: number;
    totalPrice: number;
}

export interface PurchaseOrder {
    id: string;
    poNumber: string;
    vendorId: string;
    vendorName: string;
    companyId: string;
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    currency: string;
    totalAmount: number;
    items: ProcurementItemLine[];
    createdAt: string;
}

// --------------------------------------------------------------------
// 3. WORKFLOWS & MULTI-LEVEL APPROVAL QUEUE
// --------------------------------------------------------------------
export interface ApprovalStep {
    id: string;
    sequenceOrder: number;
    assignedRoleCode: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    actionedBy?: string;
    actionedAt?: string;
    rejectionReason?: string;
}

export interface WorkflowInstance {
    id: string;
    documentType: 'PURCHASE_REQUISITION' | 'PURCHASE_ORDER' | 'VENDOR_BILL';
    documentId: string;
    documentNumber: string;
    totalAmountBaseCurrency: number; // Normalization threshold in USD
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    currentStep: number;
    steps: ApprovalStep[];
    createdAt: string;
}

// --------------------------------------------------------------------
// 4. INVENTORY & DUAL-UOM CONTROL METRICS
// --------------------------------------------------------------------
export interface MaterialMaster {
    id: string;
    code: string;
    description: string;
    category: string;
    primaryUom: string;
    secondaryUom: string;
    movingAvgUnitCost: number;
}

export interface WarehouseInventoryBalance {
    warehouseId: string;
    warehouseCode: string;
    materialId: string;
    quantityOnHand: number;
    secondaryQuantityOnHand: number;
    quantityReserved: number;
    totalValue: number;
}

// --------------------------------------------------------------------
// 5. PHASE 2 FLEET & TELEMATICS VIEW INTERFACES
// --------------------------------------------------------------------
export interface VehicleVitals {
    id: string;
    plateNumber: string;
    model: string;
    type: 'HAULER' | 'TANKER' | 'FLATBED' | 'FLEET_CAR';
    status: 'OPERATIONAL' | 'MAINTENANCE_DUE' | 'IN_SHOP' | 'CRITICAL_ALERT';
    currentOdometer: number;
    nextServiceOdometer: number;
    lastFuelEfficiency: number;
    breakdownRiskScore: number; // Grounding for Phase 3 predictive models
}

export interface MaintenanceWorkOrder {
    id: string;
    vehicleId: string;
    plateNumber: string;
    category: 'ENGINE' | 'BRAKES' | 'TIRES' | 'ELECTRICAL' | 'ROUTINE';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'PENDING' | 'IN_PROGRESS' | 'AWAITING_PARTS' | 'COMPLETED';
    estimatedCost: number;
    assignedMechanic: string;
    createdAt: string;
}
