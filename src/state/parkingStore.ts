import { Spot, Garage, Rule, Segment, UserAlert, UserProfile, RuleType } from '../types';
import { haversineDistanceMeters, snapToStreetSegment } from '../utils/geo';

// Seed coordinates around Murthal (29.03, 77.07)
const INITIAL_SPOTS: Spot[] = [
  {
    id: 'spot-1',
    lat: 29.0315,
    lng: 77.0712,
    uid: 'user-c',
    city: 'Murthal',
    note: 'In front of Amrik Sukhdev Dhaba, vacated 2 mins ago',
    taken: false,
    createdAt: Date.now() - 3 * 60 * 1000,
  },
  {
    id: 'spot-2',
    lat: 29.0285,
    lng: 77.0688,
    uid: 'user-d',
    city: 'Murthal',
    note: 'Near Gulshan Dhaba lane entrance, shaded spot',
    taken: false,
    createdAt: Date.now() - 8 * 60 * 1000,
  },
  {
    id: 'spot-3',
    lat: 29.0342,
    lng: 77.0735,
    uid: 'user-e',
    city: 'Murthal',
    note: 'Behind highway service lane, wide bay',
    taken: false,
    createdAt: Date.now() - 14 * 60 * 1000,
  },
];

const INITIAL_GARAGES: Garage[] = [
  {
    id: 'garage-1',
    lat: 29.0322,
    lng: 77.0674,
    uid: 'system',
    city: 'Murthal',
    name: 'Grand Trunk Covered Garage',
    price: 3,
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
  },
  {
    id: 'garage-2',
    lat: 29.0268,
    lng: 77.0742,
    uid: 'system',
    city: 'Murthal',
    name: 'NH44 Multi-Level Parking',
    price: 5,
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
  },
];

const INITIAL_RULES: Rule[] = [
  {
    id: 'rule-1',
    lat: 29.033,
    lng: 77.0695,
    uid: 'system',
    type: 'free',
    text: 'Free public parking for roadside dining customers',
    createdAt: Date.now() - 48 * 60 * 60 * 1000,
  },
  {
    id: 'rule-2',
    lat: 29.0292,
    lng: 77.0725,
    uid: 'system',
    type: 'paid',
    text: '2 HR, 8AM-6PM, Mon-Fri. Municipal meter $2/hr',
    createdAt: Date.now() - 48 * 60 * 60 * 1000,
  },
  {
    id: 'rule-3',
    lat: 29.0355,
    lng: 77.068,
    uid: 'system',
    type: 'no',
    text: 'NO STOPPING / TOW-AWAY ZONE 7AM-9AM MON-FRI',
    createdAt: Date.now() - 48 * 60 * 60 * 1000,
  },
];

// Pre-seeded colored street segments matching road geometry around Murthal
const INITIAL_SEGMENTS: Segment[] = [
  {
    id: 'seg-free-1',
    uid: 'system',
    type: 'free',
    text: 'Free roadside parking for dining customers (2 hr limit)',
    lat: 29.0320,
    lng: 77.0695,
    pts: [
      [29.0308, 77.0691],
      [29.0320, 77.0695],
      [29.0332, 77.0699],
    ],
    createdAt: Date.now() - 48 * 60 * 60 * 1000,
  },
  {
    id: 'seg-paid-1',
    uid: 'system',
    type: 'paid',
    text: '2 HR, 8AM-6PM, Mon-Fri. Municipal meter $2/hr',
    lat: 29.0290,
    lng: 77.0724,
    pts: [
      [29.0278, 77.0716],
      [29.0290, 77.0724],
      [29.0302, 77.0732],
    ],
    createdAt: Date.now() - 48 * 60 * 60 * 1000,
  },
  {
    id: 'seg-no-1',
    uid: 'system',
    type: 'no',
    text: 'NO STOPPING / TOW-AWAY ZONE 7AM-9AM MON-FRI',
    lat: 29.0358,
    lng: 77.0679,
    pts: [
      [29.0345, 77.0672],
      [29.0358, 77.0679],
      [29.0370, 77.0686],
    ],
    createdAt: Date.now() - 48 * 60 * 60 * 1000,
  },
];

type Listener = () => void;
type AlertListener = (message: string, alertData: { spot: Spot; distanceMeters: number }) => void;

class ParkingStore {
  private spots: Spot[] = [];
  private garages: Garage[] = [];
  private rules: Rule[] = [];
  private segments: Segment[] = [];
  private users: Record<string, UserProfile> = {
    'phone-a': {
      uid: 'phone-a',
      name: 'Phone A (Alex - Scout)',
      points: 20,
      avatarColor: '#0A4296',
    },
    'phone-b': {
      uid: 'phone-b',
      name: 'Phone B (Bella - Driver)',
      points: 15,
      avatarColor: '#10B981',
    },
  };
  private alerts: Record<string, UserAlert> = {};
  private listeners: Set<Listener> = new Set();
  private alertListeners: Set<AlertListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    this.spots = [...INITIAL_SPOTS];
    this.garages = [...INITIAL_GARAGES];
    this.rules = [...INITIAL_RULES];
    this.segments = [...INITIAL_SEGMENTS];

    // Try setting up BroadcastChannel for multi-tab sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('parkpulse_sync');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'SYNC') {
            this.spots = event.data.spots || [];
            this.garages = event.data.garages || [];
            this.rules = event.data.rules || [];
            this.segments = event.data.segments || [];
            this.users = event.data.users || this.users;
            this.alerts = event.data.alerts || this.alerts;
            this.notify();
          } else if (event.data?.type === 'ALERT_TRIGGERED') {
            this.alertListeners.forEach((l) =>
              l(event.data.message, event.data.payload)
            );
          }
        };
      } catch (_) {}
    }

    // Run 30-min auto purge every 30 seconds
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.purgeOldSpots();
      }, 30000);
    }
  }

  private broadcast(extra?: { type: string; [key: string]: any }) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'SYNC',
          spots: this.spots,
          garages: this.garages,
          rules: this.rules,
          segments: this.segments,
          users: this.users,
          alerts: this.alerts,
          ...extra,
        });
      } catch (_) {}
    }
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeAlerts(listener: AlertListener) {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  getSpots(): Spot[] {
    const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
    return this.spots.filter(
      (s) => s.createdAt > thirtyMinsAgo && !s.taken
    );
  }

  getAllSpots(): Spot[] {
    return this.spots;
  }

  getGarages(): Garage[] {
    return this.garages;
  }

  getRules(): Rule[] {
    return this.rules;
  }

  getSegments(bounds?: { south: number; north: number; west: number; east: number }): Segment[] {
    if (!bounds) return this.segments;
    return this.segments.filter((seg) => {
      // Check if any point of polyline is within visible bounding box
      return seg.pts.some(
        ([lat, lng]) =>
          lat >= bounds.south &&
          lat <= bounds.north &&
          lng >= bounds.west &&
          lng <= bounds.east
      );
    });
  }

  addSegment(seg: Omit<Segment, 'id' | 'createdAt'>): Segment {
    const newSeg: Segment = {
      ...seg,
      id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    this.segments.unshift(newSeg);
    this.notify();
    this.broadcast();
    return newSeg;
  }

  getUser(uid: string): UserProfile {
    if (!this.users[uid]) {
      this.users[uid] = {
        uid,
        name: `User ${uid.slice(0, 5)}`,
        points: 0,
        avatarColor: '#0A4296',
      };
    }
    return this.users[uid];
  }

  getAlert(uid: string): UserAlert | undefined {
    return this.alerts[uid];
  }

  private purgeOldSpots() {
    const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
    const initialCount = this.spots.length;
    this.spots = this.spots.filter((s) => s.createdAt > thirtyMinsAgo);
    if (this.spots.length !== initialCount) {
      this.notify();
      this.broadcast();
    }
  }

  // Cloud Function onSpot (+10 pts to reporter, and trigger alerts)
  addSpot(spot: Omit<Spot, 'id' | 'createdAt' | 'taken'>): Spot {
    const newSpot: Spot = {
      ...spot,
      id: `spot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      taken: false,
    };
    this.spots.unshift(newSpot);

    // +10 points to reporter (Cloud Functions v2 onSpot)
    this.addPoints(spot.uid, 10);

    // Check alerts for other users within 500m
    Object.values(this.alerts).forEach((alert) => {
      if (alert.alertOn && alert.uid !== spot.uid) {
        const distMeters = haversineDistanceMeters(
          newSpot.lat,
          newSpot.lng,
          alert.destLat,
          alert.destLng
        );
        if (distMeters <= 500) {
          const msg = `A spot just opened ${Math.round(distMeters)} m from your destination`;
          this.alertListeners.forEach((l) =>
            l(msg, { spot: newSpot, distanceMeters: distMeters })
          );
          if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
              type: 'ALERT_TRIGGERED',
              message: msg,
              payload: { spot: newSpot, distanceMeters: distMeters },
            });
          }
        }
      }
    });

    this.notify();
    this.broadcast();
    return newSpot;
  }

  // Cloud Function onGarage (+10 pts)
  addGarage(garage: Omit<Garage, 'id' | 'createdAt'>): Garage {
    const newGarage: Garage = {
      ...garage,
      id: `garage-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    this.garages.unshift(newGarage);
    this.addPoints(garage.uid, 10);
    this.notify();
    this.broadcast();
    return newGarage;
  }

  // Cloud Function onRule (+5 pts)
  addRule(rule: Omit<Rule, 'id' | 'createdAt'>): Rule {
    const newRule: Rule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    this.rules.unshift(newRule);
    this.addPoints(rule.uid, 5);

    // Asynchronously snap to nearest road vertex via Overpass API and create segment
    snapToStreetSegment(rule.lat, rule.lng).then((pts) => {
      this.addSegment({
        lat: rule.lat,
        lng: rule.lng,
        pts,
        type: rule.type,
        text: rule.text,
        uid: rule.uid,
      });
    });

    this.notify();
    this.broadcast();
    return newRule;
  }

  // Cloud Function onTaken (+3 pts to takenBy if not reporter)
  takeSpot(spotId: string, takenByUid: string): boolean {
    const spot = this.spots.find((s) => s.id === spotId);
    if (!spot || spot.taken) return false;

    spot.taken = true;
    spot.takenBy = takenByUid;

    if (takenByUid !== spot.uid) {
      this.addPoints(takenByUid, 3);
    }

    this.notify();
    this.broadcast();
    return true;
  }

  setDestinationAlert(uid: string, destLat: number, destLng: number) {
    this.alerts[uid] = {
      uid,
      token: `fcm-token-${uid}`,
      alertOn: true,
      destLat,
      destLng,
    };
    this.notify();
    this.broadcast();
  }

  cancelDestinationAlert(uid: string) {
    if (this.alerts[uid]) {
      this.alerts[uid].alertOn = false;
      this.notify();
      this.broadcast();
    }
  }

  addPoints(uid: string, amount: number) {
    const user = this.getUser(uid);
    user.points += amount;
    this.notify();
    this.broadcast();
  }

  resetDemoData() {
    this.spots = [...INITIAL_SPOTS];
    this.garages = [...INITIAL_GARAGES];
    this.rules = [...INITIAL_RULES];
    this.segments = [...INITIAL_SEGMENTS];
    this.users['phone-a'].points = 20;
    this.users['phone-b'].points = 15;
    this.alerts = {};
    this.notify();
    this.broadcast();
  }
}

export const parkingStore = new ParkingStore();
