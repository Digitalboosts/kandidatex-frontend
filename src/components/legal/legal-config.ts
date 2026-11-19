/**
 * Business and legal details used by /privacy and /terms.
 *
 * TODO(legal): fill in every `null` below. While any value is null, both pages
 * show a "Draft" banner, highlight the missing details in amber, and ask search
 * engines not to index them. Have a lawyer review both pages before launch.
 */
const VALUES = {
  companyLegalName: null,
  registeredAddress: null,
  contactEmail: null,
  grievanceOfficerName: null,
  grievanceOfficerEmail: null,
  /** City whose courts have jurisdiction, e.g. "Bengaluru, Karnataka". */
  governingCity: null,
  /** e.g. "1 December 2026". */
  effectiveDate: null,
  /** The company behind the AI vision model that names the app on screen. */
  aiVisionProvider: null,
  /** The company behind the model that writes post-interview summaries. */
  aiSummaryProvider: null,
  /** Where live video is relayed: your own LiveKit servers, or LiveKit Cloud. */
  liveVideoHosting: null,
  /** Where data is stored, e.g. "Microsoft Azure, Central India region". */
  dataRegion: null,
  /** e.g. "90 days after the interview ends". */
  recordingRetention: null,
  screenshotRetention: null,
  timelineRetention: null,
  /** How long account data is kept after an account is closed. */
  closedAccountRetention: null,
  /** How a customer cancels, e.g. "by emailing support@… from your account email". */
  cancellationMethod: null,
  /** Your refund policy in one or two sentences. */
  refundPolicy: null,
  /** Whether prices include GST, e.g. "Prices include 18% GST." */
  taxNote: null,
  /** e.g. "12 months". */
  liabilityCapPeriod: null,
  /** e.g. "30 days". */
  priceChangeNotice: null,
} satisfies Record<string, string | null>;

export type LegalField = keyof typeof VALUES;

export const LEGAL: Record<LegalField, string | null> = VALUES;

/** What each missing value is called on the page while it's still a placeholder. */
export const LEGAL_LABELS: Record<LegalField, string> = {
  companyLegalName: 'Company legal name',
  registeredAddress: 'Registered address',
  contactEmail: 'Contact email',
  grievanceOfficerName: 'Grievance Officer name',
  grievanceOfficerEmail: 'Grievance Officer email',
  governingCity: 'City for jurisdiction',
  effectiveDate: 'Effective date',
  aiVisionProvider: 'AI vision model provider',
  aiSummaryProvider: 'AI summary model provider',
  liveVideoHosting: 'Live video hosting: own LiveKit servers or LiveKit Cloud',
  dataRegion: 'Storage provider and region',
  recordingRetention: 'Recording retention period',
  screenshotRetention: 'Screenshot retention period',
  timelineRetention: 'Timeline and summary retention period',
  closedAccountRetention: 'Retention after account closure',
  cancellationMethod: 'How to cancel',
  refundPolicy: 'Refund policy',
  taxNote: 'GST note',
  liabilityCapPeriod: 'Liability cap period',
  priceChangeNotice: 'Price change notice period',
};

export const LEGAL_IS_DRAFT = Object.values(LEGAL).some((value) => value === null);
