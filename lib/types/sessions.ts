// Session Types
export type SessionType = "training" | "consultation" | "checkin";
export type SessionLocation = "gym" | "virtual";
export type SessionDuration = 30 | 45 | 60 | 90;

// Session Request Status
export type SessionRequestStatus = "pending" | "countered" | "accepted" | "declined";

// Scheduled Session Status
export type ScheduledSessionStatus = "confirmed" | "completed" | "cancelled";

// Initiator type
export type SessionInitiator = "coach" | "member";

// Proposal response
export type ProposalResponse = "accepted" | "declined" | "countered";

// Duration options for UI
export const SESSION_DURATION_OPTIONS: { value: SessionDuration; label: string }[] = [
  { value: 30, label: "30 minuta" },
  { value: 45, label: "45 minuta" },
  { value: 60, label: "1 sat" },
  { value: 90, label: "1.5 sat" },
];

// Session type options for UI
export const SESSION_TYPE_OPTIONS: { value: SessionType; label: string; icon: string }[] = [
  { value: "training", label: "Trening", icon: "💪" },
  { value: "consultation", label: "Konsultacija", icon: "💬" },
  { value: "checkin", label: "Pregled", icon: "📊" },
];

// Location options for UI
export const SESSION_LOCATION_OPTIONS: { value: SessionLocation; label: string; icon: string }[] = [
  { value: "gym", label: "U teretani", icon: "🏋️" },
  { value: "virtual", label: "Online/Poziv", icon: "📱" },
];

// Minimum advance notice for scheduling (24 hours in milliseconds)
export const MIN_ADVANCE_NOTICE_MS = 24 * 60 * 60 * 1000;

// Minimum cancellation reason length
export const MIN_CANCELLATION_REASON_LENGTH = 10;

// Session request data for API responses
export interface SessionRequestData {
  id: string;
  sessionType: SessionType;
  proposedAt: string; // ISO date string
  duration: SessionDuration;
  location: SessionLocation;
  note: string | null;
  initiatedBy: SessionInitiator;
  status: SessionRequestStatus;
  counterCount: number;
  lastActionBy: SessionInitiator | null;
  lastActionAt: string;
  createdAt: string;
  // Related data
  staff: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  member: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  // Proposal history (optional, for detailed view)
  proposalHistory?: SessionProposalData[];
}

// Session proposal history data
export interface SessionProposalData {
  id: string;
  proposedBy: SessionInitiator;
  proposedAt: string;
  duration: SessionDuration;
  location: SessionLocation;
  note: string | null;
  response: ProposalResponse | null;
  responseAt: string | null;
  createdAt: string;
}

// Scheduled session data for API responses
export interface ScheduledSessionData {
  id: string;
  sessionType: SessionType;
  scheduledAt: string;
  duration: SessionDuration;
  location: SessionLocation;
  note: string | null;
  status: ScheduledSessionStatus;
  cancelledAt: string | null;
  cancelledBy: SessionInitiator | null;
  cancellationReason: string | null;
  completedAt: string | null;
  createdAt: string;
  // Related data
  staff: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  member: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

// Create session request payload
export interface CreateSessionRequestPayload {
  memberId?: string; // Required for coach creating request
  staffId?: string; // Required for member creating request (usually from assignment)
  sessionType: SessionType;
  proposedAt: string; // ISO date string
  duration: SessionDuration;
  location: SessionLocation;
  note?: string;
}

// Respond to session request payload
export interface SessionRequestResponsePayload {
  action: "accept" | "counter" | "decline";
  // Required for counter-proposal
  proposedAt?: string;
  duration?: SessionDuration;
  location?: SessionLocation;
  note?: string;
}

// Cancel session payload
export interface CancelSessionPayload {
  reason: string; // Required, min 10 characters
}

// Validation helpers
export function isValidSessionType(type: string): type is SessionType {
  return ["training", "consultation", "checkin"].includes(type);
}

export function isValidSessionLocation(location: string): location is SessionLocation {
  return ["gym", "virtual"].includes(location);
}

export function isValidSessionDuration(duration: number): duration is SessionDuration {
  return [30, 45, 60, 90].includes(duration);
}

export function isValidProposedTime(proposedAt: Date): boolean {
  const now = new Date();
  const minTime = new Date(now.getTime() + MIN_ADVANCE_NOTICE_MS);
  return proposedAt >= minTime;
}

export function isValidCancellationReason(reason: string): boolean {
  return reason.trim().length >= MIN_CANCELLATION_REASON_LENGTH;
}

// Format helpers
export function formatSessionType(type: SessionType): string {
  const option = SESSION_TYPE_OPTIONS.find((o) => o.value === type);
  return option ? option.label : type;
}

export function formatSessionLocation(location: SessionLocation): string {
  const option = SESSION_LOCATION_OPTIONS.find((o) => o.value === location);
  return option ? option.label : location;
}

export function formatSessionDuration(duration: SessionDuration): string {
  const option = SESSION_DURATION_OPTIONS.find((o) => o.value === duration);
  return option ? option.label : `${duration} min`;
}
