/** What the pricing card needs. Mirrors part of PlanDTO from GET /api/subscription/plan. */
export interface LandingPlan {
  name: string;
  amountDisplay: string;
  /** Smallest currency unit (paise), when the API sends it. */
  amount?: number;
  interviewsPerPeriod: number;
  description: string;
}

export const FALLBACK_PLAN: LandingPlan = {
  name: 'Interview Detect Monthly',
  amountDisplay: '₹10,000',
  amount: 1_000_000,
  interviewsPerPeriod: 100,
  description: '100 monitored interviews every month.',
};

const backendUrl = process.env.BACKEND_URL ?? 'http://20.244.10.52:9090';

/**
 * The live plan from the API, cached for an hour. Any failure (offline API,
 * slow response, unexpected shape) falls back to the published plan, so the
 * landing page never breaks because of billing.
 */
export async function getLandingPlan(): Promise<LandingPlan> {
  try {
    const response = await fetch(`${backendUrl}/api/subscription/plan`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return FALLBACK_PLAN;
    const body = (await response.json()) as { plan?: Partial<LandingPlan> } | null;
    const plan = body?.plan;
    if (
      !plan ||
      typeof plan.name !== 'string' ||
      typeof plan.amountDisplay !== 'string' ||
      typeof plan.interviewsPerPeriod !== 'number' ||
      plan.interviewsPerPeriod <= 0
    ) {
      return FALLBACK_PLAN;
    }
    return {
      name: plan.name,
      amountDisplay: plan.amountDisplay,
      amount: typeof plan.amount === 'number' ? plan.amount : undefined,
      interviewsPerPeriod: plan.interviewsPerPeriod,
      description: typeof plan.description === 'string' ? plan.description : FALLBACK_PLAN.description,
    };
  } catch {
    return FALLBACK_PLAN;
  }
}
