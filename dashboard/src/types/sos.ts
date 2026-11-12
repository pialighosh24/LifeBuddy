export type SosAlertStatus = 'created' | 'pending' | 'sent' | 'failed' | 'acknowledged' | 'cancelled';
export type SosLocationStatus = 'available' | 'unavailable' | 'denied' | 'disabled';
export type SosDeliveryStatus = 'not_applicable' | 'pending' | 'sent' | 'failed' | 'confirmed';

export interface SosAlert {
  id: number;
  careUserId: number;
  emergencyContactId: number | null;
  latitude: number | null;
  longitude: number | null;
  locationStatus: SosLocationStatus;
  alertStatus: SosAlertStatus;
  deliveryStatus: SosDeliveryStatus;
  deliveryChannel?: string | null;
  deliveryMessage?: string | null;
  failureReason?: string | null;
  triggeredAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: number | null;
  clientEventId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
