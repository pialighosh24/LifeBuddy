export type LocationStatus = 'available' | 'unavailable' | 'denied' | 'disabled';
export type AlertStatus = 'created' | 'pending' | 'sent' | 'failed' | 'acknowledged' | 'cancelled';
export type DeliveryStatus = 'not_applicable' | 'pending' | 'sent' | 'failed' | 'confirmed';

export interface SosAlert {
  id: number;
  careUserId: number;
  emergencyContactId: number | null;
  latitude: number | null;
  longitude: number | null;
  locationStatus: LocationStatus;
  alertStatus: AlertStatus;
  deliveryStatus: DeliveryStatus;
  deliveryChannel: string | null;
  deliveryMessage: string | null;
  failureReason: string | null;
  triggeredAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: number | null;
  clientEventId: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface SosTransmission {
  saved: boolean;
  externalDeliveryConfirmed: boolean;
  message?: string;
}

export interface CreateSosResponseData {
  alert: SosAlert;
  transmission: SosTransmission;
  idempotent?: boolean;
}

export interface EmergencyContact {
  id: number;
  careUserId: number;
  contactName: string;
  relationshipLabel: string | null;
  phoneNumber: string;
  email: string | null;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}
