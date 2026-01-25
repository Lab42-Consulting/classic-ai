import { vi, beforeEach, afterEach } from 'vitest'

// Mock Prisma client - define mocks first, then reference them in both $transaction and default export
vi.mock('@/lib/db', () => {
  // Define all model mocks that can be reused
  const memberMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  }

  const staffMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  }

  const gymMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  }

  const dailyLogMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  }

  const weeklyCheckinMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  }

  const coachAssignmentMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  const coachRequestMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  }

  const coachNudgeMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  }

  const coachKnowledgeMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  }

  const chatMessageMock = {
    findMany: vi.fn(),
    create: vi.fn(),
  }

  const aIUsageDailyMock = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  }

  const aIUsageMonthlyMock = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  }

  const aIResponseCacheMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  }

  const customMealMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  const mealIngredientMock = {
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  }

  const savedIngredientMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  const challengeMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  const challengeParticipantMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  }

  const challengeWinnerMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  const gymCheckinMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  }

  const sessionRequestMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  const sessionProposalMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  }

  const scheduledSessionMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  const customMetricMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  const metricEntryMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  const goalMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  }

  const goalOptionMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  }

  const goalVoteMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  }

  const goalContributionMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  }

  const subscriptionLogMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  }

  // Build the prisma mock object
  const prismaMock = {
    member: memberMock,
    staff: staffMock,
    gym: gymMock,
    dailyLog: dailyLogMock,
    weeklyCheckin: weeklyCheckinMock,
    coachAssignment: coachAssignmentMock,
    coachRequest: coachRequestMock,
    coachNudge: coachNudgeMock,
    coachKnowledge: coachKnowledgeMock,
    chatMessage: chatMessageMock,
    aIUsageDaily: aIUsageDailyMock,
    aIUsageMonthly: aIUsageMonthlyMock,
    aIResponseCache: aIResponseCacheMock,
    customMeal: customMealMock,
    mealIngredient: mealIngredientMock,
    savedIngredient: savedIngredientMock,
    challenge: challengeMock,
    challengeParticipant: challengeParticipantMock,
    challengeWinner: challengeWinnerMock,
    gymCheckin: gymCheckinMock,
    sessionRequest: sessionRequestMock,
    sessionProposal: sessionProposalMock,
    scheduledSession: scheduledSessionMock,
    customMetric: customMetricMock,
    metricEntry: metricEntryMock,
    goal: goalMock,
    goalOption: goalOptionMock,
    goalVote: goalVoteMock,
    goalContribution: goalContributionMock,
    subscriptionLog: subscriptionLogMock,
    // $transaction passes the same mocks as tx argument
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => {
      return callback(prismaMock)
    }),
  }

  return { default: prismaMock, prisma: prismaMock }
})

// Mock auth module
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
  getMemberFromSession: vi.fn(),
  getMemberAuthErrorMessage: vi.fn().mockImplementation((error: string) => {
    switch (error) {
      case 'NO_SESSION':
        return 'Niste prijavljeni. Molimo prijavite se ponovo.'
      case 'STAFF_NO_LINKED_MEMBER':
        return 'Nemate povezan članski nalog. Kreirajte ga u podešavanjima.'
      case 'INVALID_USER_TYPE':
        return 'Nemate pristup ovoj funkciji.'
      default:
        return 'Došlo je do greške pri autorizaciji.'
    }
  }),
  createSession: vi.fn(),
  verifySession: vi.fn(),
  setSessionCookie: vi.fn(),
  clearSession: vi.fn(),
  hashPin: vi.fn(),
  verifyPin: vi.fn(),
  generateMemberId: vi.fn(),
  generatePin: vi.fn(),
  generateStaffId: vi.fn(),
}))

// Mock AI cache module (rate limiting)
vi.mock('@/lib/ai/cache', () => ({
  checkAndIncrementRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, limit: 20 }),
  checkAndIncrementRateLimitWithTier: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, limit: 20 }),
  decrementUsage: vi.fn().mockResolvedValue(undefined),
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, limit: 20 }),
  incrementUsage: vi.fn().mockResolvedValue(undefined),
  trackAIUsage: vi.fn().mockResolvedValue(undefined),
  trackUsage: vi.fn().mockResolvedValue(undefined),
  checkCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue(undefined),
  cleanupOldCache: vi.fn().mockResolvedValue(undefined),
  checkGymBudget: vi.fn().mockResolvedValue({ allowed: true, remaining: 100, budgetUsd: 50 }),
}))

// Mock goals voting module
vi.mock('@/lib/goals/voting', () => ({
  castVote: vi.fn(),
  selectWinner: vi.fn(),
  closeExpiredVoting: vi.fn().mockResolvedValue(0),
  getMemberVote: vi.fn(),
  getVoteBreakdown: vi.fn(),
  addContribution: vi.fn(),
}))

// Mock subscription guards module (feature gating)
vi.mock('@/lib/subscription/guards', () => ({
  checkFeatureAccess: vi.fn().mockResolvedValue({ allowed: true, tier: 'pro' }),
  checkMemberCapacity: vi.fn().mockResolvedValue({ allowed: true, current: 10, limit: 150, tier: 'pro' }),
  getAiRateLimitForTier: vi.fn().mockReturnValue(25),
  getGymTierForMember: vi.fn().mockResolvedValue('pro'),
  checkMultipleFeatures: vi.fn().mockResolvedValue({ allowed: true, tier: 'pro' }),
  getGymTierInfo: vi.fn().mockResolvedValue({
    tier: 'pro',
    tierName: 'Pro',
    limits: { maxActiveMembers: 150, aiMessagesPerMemberPerDay: 25, aiMonthlyBudgetUsd: 15.0 },
    features: { challenges: true, sessionScheduling: true, coachFeatures: true, customBranding: false },
    memberCount: 10,
    memberCapacityUsed: 7,
  }),
}))

// Mock QRCode
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
  },
  toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
}))

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Mock AI response' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  })),
}))

// Mock Vercel Blob
const mockBlobResult = {
  url: 'https://test.blob.vercel-storage.com/test-image.jpg',
  downloadUrl: 'https://test.blob.vercel-storage.com/test-image.jpg',
  pathname: 'test-image.jpg',
  contentType: 'image/jpeg',
  contentDisposition: 'attachment; filename="test-image.jpg"',
}

vi.mock('@vercel/blob', () => {
  return {
    put: vi.fn(() => Promise.resolve(mockBlobResult)),
    del: vi.fn(() => Promise.resolve(undefined)),
    head: vi.fn(() => Promise.resolve(null)),
    list: vi.fn(() => Promise.resolve({ blobs: [] })),
  }
})

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})
