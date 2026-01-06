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
    gymCheckin: gymCheckinMock,
    sessionRequest: sessionRequestMock,
    sessionProposal: sessionProposalMock,
    scheduledSession: scheduledSessionMock,
    // $transaction passes the same mocks as tx argument
    $transaction: vi.fn(async (callback: (tx: typeof prismaMock) => Promise<unknown>) => {
      return callback(prismaMock)
    }),
  }

  return { default: prismaMock }
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
  decrementUsage: vi.fn().mockResolvedValue(undefined),
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, limit: 20 }),
  incrementUsage: vi.fn().mockResolvedValue(undefined),
  trackUsage: vi.fn().mockResolvedValue(undefined),
  checkCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue(undefined),
  cleanupOldCache: vi.fn().mockResolvedValue(undefined),
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

// Clean up after tests
afterEach(() => {
  vi.resetAllMocks()
})
