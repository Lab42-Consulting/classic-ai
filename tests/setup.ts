import { vi, beforeEach, afterEach } from 'vitest'

// Mock Prisma client
vi.mock('@/lib/db', () => ({
  default: {
    member: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    staff: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    gym: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    dailyLog: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    weeklyCheckin: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    coachAssignment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    coachRequest: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    coachNudge: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    coachKnowledge: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    chatMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    aIUsageDaily: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    aIUsageMonthly: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    aIResponseCache: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    customMeal: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mealIngredient: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    savedIngredient: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    challenge: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    challengeParticipant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    gymCheckin: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}))

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
