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
    },
    staff: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    gym: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
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
  },
}))

// Mock auth module
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
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

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

// Clean up after tests
afterEach(() => {
  vi.resetAllMocks()
})
