/**
 * Types for the dashboard (interviewer pages and the candidate's joining page) and the
 * detection engine. API shapes match the Python API server: see docs/API.md.
 */

export type UserRole = 'ADMIN' | 'INTERVIEWER';
export type InterviewStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type EventSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type ClarityLevel = 'good' | 'fair' | 'poor';
export type LightingLevel = 'good' | 'low' | 'high';
export type StabilityLevel = 'stable' | 'moderate' | 'unstable';
export type AlignmentLevel = 'correct' | 'off_center' | 'skewed' | 'too_close' | 'too_far' | 'cut_off' | 'unknown';

export interface Point {
  x: number;
  y: number;
}

export type FrameSide = 'left' | 'right' | 'top' | 'bottom';

export type InstructionCode =
  | 'point_at_screen'
  | 'move_left'
  | 'move_right'
  | 'move_up'
  | 'move_down'
  | 'move_closer'
  | 'move_farther'
  | 'increase_lighting'
  | 'reduce_glare'
  | 'hold_steady'
  | 'improve_focus'
  | 'correct_angle'
  | 'properly_positioned';

/**
 * Output of the screen detection engine for one frame. Every value comes from
 * image measurements; `readinessScore` is a capture-readiness score, not an
 * accuracy figure or a cheating probability.
 */
export interface DetectionResult {
  screenDetected: boolean;
  cornersDetected: number;
  visibilityPercentage: number;
  clarity: ClarityLevel;
  lighting: LightingLevel;
  stability: StabilityLevel;
  alignment: AlignmentLevel;
  readinessScore: number;
  /** Ordered most urgent first; the first entry is what the UI should show. */
  instructions: InstructionCode[];
  /** Screen polygon in normalized frame coordinates (0..1), clockwise from top-left. */
  corners: Point[];
  cutOffSides: FrameSide[];
  scoreBreakdown: ScoreBreakdown;
  metrics: DetectionMetrics;
}

export interface ScoreBreakdown {
  boundary: number;
  corners: number;
  positioning: number;
  clarity: number;
  lighting: number;
  stability: number;
}

export interface DetectionMetrics {
  brightness: number;
  laplacianVariance: number;
  /** Normalized frame-to-frame movement, 0 = none. */
  movement: number;
  /** 0 = viewed head-on, 1 = extreme perspective distortion. */
  perspectiveDistortion: number;
  /** Fraction of the frame covered by the detected screen, 0..1. */
  areaFraction: number;
  /** Screen centre offset from frame centre, as a fraction of the frame, -0.5..0.5. */
  offsetX: number;
  offsetY: number;
}

export type MonitoringEventType =
  | 'consent_accepted'
  | 'candidate_joined'
  | 'candidate_left'
  | 'candidate_reconnecting'
  | 'candidate_reconnected'
  | 'interviewer_joined'
  | 'interviewer_left'
  | 'camera_connected'
  | 'camera_disconnected'
  | 'camera_permission_error'
  | 'calibration_passed'
  | 'monitoring_started'
  | 'screen_detected'
  | 'screen_lost'
  | 'visibility_dropped'
  | 'positioning_corrected'
  | 'video_stopped'
  | 'video_resumed'
  | 'network_unstable'
  | 'network_recovered'
  | 'app_backgrounded'
  | 'app_foregrounded'
  | 'session_ended'
  | 'screen_app_review'
  | 'screen_app_changed';

/** Which measurement path produced a status update. */
export type StatusSource = 'calibration' | 'stream_analysis';

export interface MonitoringStatusInput {
  interviewId: string;
  source: StatusSource;
  screenDetected: boolean;
  visibilityPercentage: number;
  clarity: ClarityLevel;
  lighting: LightingLevel;
  stability: StabilityLevel;
  alignment: AlignmentLevel;
  readinessScore: number;
}

export interface MonitoringStatusDTO extends Omit<MonitoringStatusInput, 'interviewId'> {
  id: string;
  interviewId: string;
  updatedAt: string;
}

export interface MonitoringEventDTO {
  id: string;
  interviewId: string;
  eventType: MonitoringEventType;
  message: string;
  severity: EventSeverity;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface InterviewDTO {
  id: string;
  title: string;
  interviewerId: string;
  candidateName: string;
  status: InterviewStatus;
  livekitRoomName: string;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  candidateJoinedAt: string | null;
  monitoringStatus?: MonitoringStatusDTO | null;
}

/** What a candidate may see about their own interview. */
export interface CandidateInterviewDTO {
  id: string;
  title: string;
  candidateName: string;
  status: InterviewStatus;
  startedAt: string | null;
  endedAt: string | null;
}

export interface AuthResponse {
  token: string;
  user: UserDTO;
}


export interface JoinResponse {
  /** Candidate session token, scoped to this interview only. */
  token: string;
  interview: CandidateInterviewDTO;
  readinessThreshold: number;
}

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  roomName: string;
  identity: string;
  expiresInSeconds: number;
}

export interface AnalyticsOverview {
  totals: { total: number; active: number; completed: number; upcoming: number };
  interviewsByDay: { date: string; count: number }[];
  eventsBySeverity: { severity: EventSeverity; count: number }[];
}

/** Category of the application the screen analyzer saw. */
export type ScreenAppCategory =
  | 'DESKTOP'
  | 'CODE_EDITOR'
  | 'IDE'
  | 'WEB_BROWSER'
  | 'AI_ASSISTANT'
  | 'TERMINAL'
  | 'DOCUMENT_EDITOR'
  | 'SPREADSHEET'
  | 'PRESENTATION'
  | 'VIDEO_CALL'
  | 'FILE_MANAGER'
  | 'OTHER'
  | 'UNKNOWN';

/** HIGH = review recommended, MEDIUM = application changed, LOW = normal. Never proof of cheating. */
export type ScreenAlertLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/** Response of POST /api/monitoring/screen-analysis. The only snake_case shape in the API. */
export interface ScreenAnalysisResult {
  /** `UNKNOWN` means the frame was unclear and should be ignored. */
  application: string;
  category: ScreenAppCategory;
  activity: string;
  alert_level: ScreenAlertLevel;
  message: string;
  /** 0..1 */
  confidence: number;
}

export type RecordingStatus = 'RECORDING' | 'READY' | 'FAILED';
export type RecordingContentType = 'video/webm' | 'video/mp4';

export interface RecordingDTO {
  id: string;
  interviewId: string;
  interviewTitle: string;
  candidateName: string;
  status: RecordingStatus;
  contentType: RecordingContentType;
  sizeBytes: number | null;
  durationSeconds: number | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  /** A same-origin path, set only when `status` is READY. */
  videoUrl: string | null;
}

/** A HIGH screen alert the server stored, with its screenshot. Field names are camelCase here. */
export interface ScreenAlertDTO {
  id: string;
  interviewId: string;
  userId: string;
  application: string;
  category: ScreenAppCategory;
  activity: string;
  alertLevel: ScreenAlertLevel;
  message: string;
  confidence: number;
  /** Same-origin path to the screenshot; works with the session cookie. Use this, not `blobUrl`. */
  imageUrl: string;
  /** Private Azure blob; it does not open in a browser. */
  blobUrl: string;
  createdAt: string;
}

/** AI-written 100–120 word summary of an interview's stored alerts. */
export interface InterviewSummaryDTO {
  interviewId: string;
  userId: string;
  summary: string;
  wordCount: number;
  alertCount: number;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/interviews/{id}/report: everything stored for one interview. */
export interface InterviewReport {
  interview: InterviewDTO;
  recordings: RecordingDTO[];
  /** Oldest first. */
  screenAlerts: ScreenAlertDTO[];
  summary: InterviewSummaryDTO | null;
  events: MonitoringEventDTO[];
}

export interface PlanDTO {
  code: string;
  name: string;
  description: string;
  /** Smallest currency unit (paise). Show `amountDisplay` instead. */
  amount: number;
  amountDisplay: string;
  currency: string;
  interval: string;
  interviewsPerPeriod: number;
}

export type SubscriptionStatus =
  | 'CREATED'
  | 'ACTIVE'
  | 'PENDING'
  | 'HALTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'PAUSED';

export interface InterviewQuota {
  included: number;
  used: number;
  remaining: number;
}

export interface SubscriptionDTO {
  status: SubscriptionStatus;
  active: boolean;
  plan: PlanDTO;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  interviews: InterviewQuota;
}

export interface TransactionDTO {
  id: string;
  razorpayPaymentId: string;
  amount: number;
  amountDisplay: string;
  currency: string;
  status: 'CAPTURED' | 'FAILED';
  method: string | null;
  createdAt: string;
}

/** GET /api/subscription/me */
export interface SubscriptionMe {
  /** True when the user may create interviews. */
  subscribed: boolean;
  /** Null if the user never started checkout. */
  subscription: SubscriptionDTO | null;
  interviews: InterviewQuota;
  /** Newest first. */
  transactions: TransactionDTO[];
}

export interface CheckoutResponse {
  keyId: string;
  subscriptionId: string;
  plan: PlanDTO;
}

export interface VerifyPaymentResponse {
  status: 'active' | 'pending';
  subscription: SubscriptionDTO;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/** Topic and shape of messages the backend sends into the LiveKit room. */
export const REALTIME_TOPIC = 'monitoring';

export type RealtimeMessage =
  | { type: 'event'; event: MonitoringEventDTO }
  | { type: 'status'; status: MonitoringStatusDTO }
  | { type: 'session_ended'; interviewId: string; endedBy: 'interviewer' | 'candidate' | 'system' };

export const CANDIDATE_IDENTITY_PREFIX = 'candidate-';
