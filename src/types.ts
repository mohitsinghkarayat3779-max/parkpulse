export interface Spot {
  id: string;
  lat: number;
  lng: number;
  uid: string;
  city: string;
  note: string;
  taken: boolean;
  createdAt: number; // Unix timestamp in ms
  takenBy?: string;
}

export interface Garage {
  id: string;
  lat: number;
  lng: number;
  uid: string;
  city: string;
  name: string;
  price: number;
  createdAt: number;
}

export type RuleType = 'free' | 'paid' | 'no';

export interface Rule {
  id: string;
  lat: number;
  lng: number;
  uid: string;
  type: RuleType;
  text: string;
  createdAt: number;
  summary?: string;
  verdict?: string;
}

export interface UserAlert {
  uid: string;
  token: string;
  alertOn: boolean;
  destLat: number;
  destLng: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  points: number;
  avatarColor: string;
}
