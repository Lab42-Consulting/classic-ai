/**
 * Test fixtures for API tests
 * These provide consistent test data across all test files
 */

// =============================================================================
// GYM FIXTURES
// =============================================================================

export const mockGym = {
  id: 'gym-test-001',
  name: 'Classic Gym',
  logo: null,
  settings: {},
  aiMonthlyBudget: 100.0,
  primaryColor: null,
  secondaryColor: null,
  subscriptionStatus: 'active',
  subscribedAt: new Date('2024-01-01'),
  subscribedUntil: new Date('2025-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockGymWithBranding = {
  ...mockGym,
  logo: 'data:image/png;base64,mockLogo',
  primaryColor: '#3b82f6',
  secondaryColor: '#10b981',
}

// Multi-location owner fixtures
export const mockGymWithOwner = {
  ...mockGym,
  id: 'gym-owner-001',
  name: 'Classic Gym - Main',
  ownerEmail: 'owner@classic.com',
  ownerName: 'Owner User',
  address: 'Main Street 1',
}

export const mockGymWithOwner2 = {
  ...mockGym,
  id: 'gym-owner-002',
  name: 'Classic Gym - Branch',
  ownerEmail: 'owner@classic.com',
  ownerName: 'Owner User',
  address: 'Branch Street 2',
}

export const mockGymDifferentOwner = {
  ...mockGym,
  id: 'gym-different-001',
  name: 'Different Gym',
  ownerEmail: 'different@gym.com',
  ownerName: 'Different Owner',
}

// =============================================================================
// MEMBER FIXTURES
// =============================================================================

export const mockMember = {
  id: 'member-test-001',
  memberId: 'ABC123',
  pin: '$2a$10$hashedPinValue', // bcrypt hash
  qrCode: 'data:image/png;base64,mockQRCode',
  name: 'Marko Markovic',
  height: 180,
  weight: 85,
  gender: 'male',
  goal: 'fat_loss',
  status: 'active',
  locale: 'sr',
  difficultyMode: 'standard', // simple | standard | pro
  hasSeenOnboarding: true,
  subscribedAt: new Date('2024-12-01'),
  subscribedUntil: new Date('2025-12-01'),
  subscriptionStatus: 'active',
  gymId: 'gym-test-001',
  createdAt: new Date('2024-12-01'),
  updatedAt: new Date('2024-12-01'),
}

export const mockMemberWithGym = {
  ...mockMember,
  gym: mockGym,
}

export const mockExpiredMember = {
  ...mockMember,
  id: 'member-test-002',
  memberId: 'EXP001',
  name: 'Expired User',
  subscriptionStatus: 'expired',
  subscribedUntil: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
}

export const mockInactiveMember = {
  ...mockMember,
  id: 'member-test-003',
  memberId: 'INA001',
  name: 'Inactive User',
  status: 'inactive',
}

export const mockMemberMuscleGain = {
  ...mockMember,
  id: 'member-test-004',
  memberId: 'MUS001',
  name: 'Muscle Builder',
  goal: 'muscle_gain',
  weight: 75,
}

export const mockMemberRecomp = {
  ...mockMember,
  id: 'member-test-005',
  memberId: 'REC001',
  name: 'Recomp User',
  goal: 'recomposition',
}

// =============================================================================
// STAFF FIXTURES
// =============================================================================

export const mockStaffCoach = {
  id: 'staff-test-001',
  staffId: 'S-COACH',
  pin: '$2a$10$hashedPinValue',
  name: 'Coach Marko',
  role: 'COACH',
  locale: 'sr',
  avatarUrl: null,
  bio: null,
  linkedMemberId: null,
  gymId: 'gym-test-001',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockStaffAdmin = {
  id: 'staff-test-002',
  staffId: 'S-ADMIN',
  pin: '$2a$10$hashedPinValue',
  name: 'Admin User',
  role: 'ADMIN',
  locale: 'sr',
  avatarUrl: null,
  bio: null,
  linkedMemberId: null,
  gymId: 'gym-test-001',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockStaffOwner = {
  id: 'staff-test-004',
  staffId: 'S-OWNER',
  pin: '$2a$10$hashedPinValue',
  name: 'Owner User',
  role: 'owner',
  locale: 'sr',
  avatarUrl: null,
  bio: null,
  linkedMemberId: null,
  gymId: 'gym-test-001',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockStaffCoachWithLinkedMember = {
  ...mockStaffCoach,
  id: 'staff-test-003',
  staffId: 'S-DUAL',
  name: 'Dual-Role Coach',
  linkedMemberId: 'member-test-006',
}

// =============================================================================
// SESSION FIXTURES
// =============================================================================

export const mockMemberSession = {
  userId: mockMember.id,
  userType: 'member' as const,
  gymId: mockGym.id,
  exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
}

export const mockStaffSession = {
  userId: mockStaffCoach.id,
  userType: 'staff' as const,
  gymId: mockGym.id,
  exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
}

export const mockAdminSession = {
  userId: mockStaffAdmin.id,
  userType: 'staff' as const,
  gymId: mockGym.id,
  exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
}

export const mockOwnerSession = {
  userId: mockStaffOwner.id,
  userType: 'staff' as const,
  gymId: mockGymWithOwner.id,
  exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
}

// Owner with gym relation for location management
export const mockStaffOwnerWithGym = {
  ...mockStaffOwner,
  gymId: mockGymWithOwner.id,
  gym: mockGymWithOwner,
}

export const mockStaffOwnerWithGym2 = {
  ...mockStaffOwner,
  id: 'staff-test-005',
  staffId: 'S-OWNER2',
  gymId: mockGymWithOwner2.id,
  gym: mockGymWithOwner2,
}

// =============================================================================
// getMemberFromSession RESULT FIXTURES
// =============================================================================

export const mockMemberAuthResult = {
  memberId: mockMember.id,
  gymId: mockGym.id,
  isStaffMember: false,
}

export const mockStaffMemberAuthResult = {
  memberId: 'member-test-006', // Staff's linked member
  gymId: mockGym.id,
  isStaffMember: true,
  staffId: mockStaffCoach.id, // The staff ID of the coach accessing their linked member
}

export const mockNoSessionError = {
  error: 'NO_SESSION' as const,
}

export const mockStaffNoLinkedMemberError = {
  error: 'STAFF_NO_LINKED_MEMBER' as const,
}

export const mockInvalidUserTypeError = {
  error: 'INVALID_USER_TYPE' as const,
}

// =============================================================================
// DAILY LOG FIXTURES
// =============================================================================

export const mockMealLog = {
  id: 'log-meal-001',
  memberId: mockMember.id,
  date: new Date(),
  type: 'meal',
  mealSize: 'medium',
  mealName: 'Piletina sa risom',
  estimatedCalories: 500,
  estimatedProtein: 50,
  estimatedCarbs: 38,
  estimatedFats: 17,
  createdAt: new Date(),
}

export const mockTrainingLog = {
  id: 'log-training-001',
  memberId: mockMember.id,
  date: new Date(),
  type: 'training',
  mealSize: null,
  mealName: null,
  estimatedCalories: null,
  estimatedProtein: null,
  estimatedCarbs: null,
  estimatedFats: null,
  createdAt: new Date(),
}

export const mockWaterLog = {
  id: 'log-water-001',
  memberId: mockMember.id,
  date: new Date(),
  type: 'water',
  mealSize: null,
  mealName: null,
  estimatedCalories: null,
  estimatedProtein: null,
  estimatedCarbs: null,
  estimatedFats: null,
  createdAt: new Date(),
}

export const mockExactMacroLog = {
  id: 'log-exact-001',
  memberId: mockMember.id,
  date: new Date(),
  type: 'meal',
  mealSize: 'exact',
  mealName: 'Custom meal',
  estimatedCalories: 455, // 35*4 + 45*4 + 15*9
  estimatedProtein: 35,
  estimatedCarbs: 45,
  estimatedFats: 15,
  createdAt: new Date(),
}

// =============================================================================
// WEEKLY CHECKIN FIXTURES
// =============================================================================

export const mockWeeklyCheckin = {
  id: 'checkin-001',
  memberId: mockMember.id,
  weight: 84.5,
  feeling: 3,
  photoUrl: null,
  weekNumber: 52,
  year: 2024,
  createdAt: new Date('2024-12-29'), // A Sunday
}

export const mockCheckinHistory = [
  { ...mockWeeklyCheckin, id: 'checkin-001', weekNumber: 52, weight: 84.5, feeling: 3 },
  { ...mockWeeklyCheckin, id: 'checkin-002', weekNumber: 51, weight: 85.0, feeling: 2 },
  { ...mockWeeklyCheckin, id: 'checkin-003', weekNumber: 50, weight: 85.5, feeling: 3 },
  { ...mockWeeklyCheckin, id: 'checkin-004', weekNumber: 49, weight: 86.0, feeling: 4 },
]

// =============================================================================
// COACH ASSIGNMENT FIXTURES
// =============================================================================

export const mockCoachAssignment = {
  id: 'assignment-001',
  staffId: mockStaffCoach.id,
  memberId: mockMember.id,
  assignedAt: new Date('2024-12-01'),
  customGoal: null,
  customCalories: 1800,
  customProtein: 150,
  customCarbs: null,
  customFats: null,
  notes: 'Focus on fat loss with high protein',
  requireExactMacros: false,
}

export const mockCoachAssignmentWithExactMacros = {
  ...mockCoachAssignment,
  id: 'assignment-002',
  requireExactMacros: true,
  customCalories: 2000,
  customProtein: 160,
  customCarbs: 200,
  customFats: 70,
}

// =============================================================================
// COACH REQUEST FIXTURES (Pending requests awaiting member approval)
// =============================================================================

export const mockCoachRequest = {
  id: 'request-001',
  staffId: mockStaffCoach.id,
  memberId: mockMember.id,
  initiatedBy: 'coach', // Coach-initiated request with a plan
  memberFirstName: null,
  memberLastName: null,
  memberPhone: null,
  memberMessage: null,
  customGoal: null,
  customCalories: 1800,
  customProtein: 150,
  customCarbs: null,
  customFats: null,
  notes: 'Focus on fat loss with high protein',
  requireExactMacros: false,
  createdAt: new Date('2024-12-01'),
}

export const mockMemberInitiatedRequest = {
  ...mockCoachRequest,
  id: 'request-002',
  initiatedBy: 'member', // Member interest signal (no plan)
  memberFirstName: 'Marko',
  memberLastName: 'Markovic',
  memberPhone: '+381641234567',
  memberMessage: 'Zelim da radim na gubitku masti',
  customGoal: null,
  customCalories: null,
  customProtein: null,
  notes: null,
}

export const mockCoachRequestWithStaffAndMember = {
  ...mockCoachRequest,
  staff: { name: mockStaffCoach.name },
  member: mockMember,
}

// =============================================================================
// COACH NUDGE FIXTURES
// =============================================================================

export const mockCoachNudge = {
  id: 'nudge-001',
  staffId: mockStaffCoach.id,
  memberId: mockMember.id,
  message: 'Odlicno napredujes! Nastavi tako!',
  createdAt: new Date(),
  seenAt: null,
}

export const mockSeenNudge = {
  ...mockCoachNudge,
  id: 'nudge-002',
  seenAt: new Date(),
}

// =============================================================================
// COACH KNOWLEDGE FIXTURES
// =============================================================================

export const mockCoachKnowledgeNutrition = {
  id: 'knowledge-001',
  staffId: mockStaffCoach.id,
  memberId: mockMember.id,
  agentType: 'nutrition',
  content: 'Preporucene namirnice: piletina, riba, jaja. Izbegavati: mlecne proizvode.',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockCoachKnowledgeTraining = {
  id: 'knowledge-002',
  staffId: mockStaffCoach.id,
  memberId: mockMember.id,
  agentType: 'training',
  content: 'Program: Upper/Lower split, 4x nedeljno. Izbegavati cucnjeve - problem sa kolenom.',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockCoachKnowledgeSupplements = {
  id: 'knowledge-003',
  staffId: mockStaffCoach.id,
  memberId: mockMember.id,
  agentType: 'supplements',
  content: 'Vec koristi multivitamin. Preporuciti kreatin 5g dnevno.',
  createdAt: new Date(),
  updatedAt: new Date(),
}

// =============================================================================
// AI/CHAT FIXTURES
// =============================================================================

export const mockChatMessage = {
  id: 'chat-001',
  memberId: mockMember.id,
  role: 'user',
  content: 'Sta da jedem pre treninga?',
  agentType: 'nutrition',
  createdAt: new Date(),
}

export const mockAIUsageDaily = {
  id: 'usage-daily-001',
  memberId: mockMember.id,
  date: new Date(),
  count: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockAIUsageMonthly = {
  id: 'usage-monthly-001',
  gymId: mockGym.id,
  year: 2024,
  month: 12,
  totalRequests: 100,
  totalTokensIn: 50000,
  totalTokensOut: 25000,
  estimatedCostUsd: 2.5,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// =============================================================================
// HELPER FUNCTIONS FOR CREATING REQUEST MOCKS
// =============================================================================

export function createMockRequest(body: object, method = 'POST'): Request {
  return new Request('http://localhost:3000/api/test', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function createMockGetRequest(searchParams?: Record<string, string>): Request {
  const url = new URL('http://localhost:3000/api/test')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new Request(url.toString(), { method: 'GET' })
}

// =============================================================================
// CUSTOM MEAL FIXTURES
// =============================================================================

export const mockMealIngredient = {
  id: 'ingredient-001',
  customMealId: 'meal-001',
  name: 'Chicken Breast',
  portionSize: '150g',
  calories: 248,
  protein: 47,
  carbs: 0,
  fats: 5,
  savedIngredientId: null,
  createdAt: new Date(),
}

export const mockCustomMeal = {
  id: 'meal-001',
  memberId: mockMember.id,
  gymId: mockGym.id,
  name: 'Piletina sa risom',
  totalCalories: 650,
  totalProtein: 55,
  totalCarbs: 60,
  totalFats: 15,
  isManualTotal: false,
  isShared: false,
  shareApproved: false,
  shareRequestedAt: null,
  createdByCoachId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockCoachMeal = {
  ...mockCustomMeal,
  id: 'meal-002',
  name: 'Pre-Workout Meal',
  createdByCoachId: mockStaffCoach.id,
  totalCalories: 450,
  totalProtein: 35,
  totalCarbs: 45,
  totalFats: 12,
}

export const mockSharedMeal = {
  ...mockCustomMeal,
  id: 'meal-003',
  name: 'Shared Healthy Meal',
  isShared: true,
  shareApproved: true,
  shareRequestedAt: new Date(),
  photoUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', // Mock base64 JPEG
}

// Meal with photo (private)
export const mockMealWithPhoto = {
  ...mockCustomMeal,
  id: 'meal-004',
  name: 'Meal With Photo',
  photoUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', // Mock base64 JPEG
}

// Pending shared meal (awaiting admin approval)
export const mockPendingSharedMeal = {
  ...mockCustomMeal,
  id: 'meal-005',
  name: 'Pending Shared Meal',
  isShared: true,
  shareApproved: false,
  shareRequestedAt: new Date(),
  photoUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
}

// Valid base64 JPEG header for testing (small valid image)
export const mockValidPhotoBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAA=='

// Invalid photo (too large - over 1MB)
export const mockOversizedPhoto = 'data:image/jpeg;base64,' + 'A'.repeat(1.5 * 1024 * 1024)

// Invalid photo format
export const mockInvalidPhotoFormat = 'data:text/plain;base64,SGVsbG8gV29ybGQ='

export const mockMealWithIngredients = {
  ...mockCustomMeal,
  ingredients: [mockMealIngredient],
  member: { name: mockMember.name },
  createdByCoach: null,
}

export const mockCoachMealWithIngredients = {
  ...mockCoachMeal,
  ingredients: [mockMealIngredient],
  member: { name: mockMember.name },
  createdByCoach: { name: mockStaffCoach.name },
}

// =============================================================================
// DATE HELPERS FOR TESTING
// =============================================================================

export function getSunday(offset = 0): Date {
  const date = new Date()
  const day = date.getDay()
  const diff = day === 0 ? 0 : 7 - day
  date.setDate(date.getDate() + diff + offset * 7)
  date.setHours(12, 0, 0, 0)
  return date
}

export function getWeekday(): Date {
  const date = new Date()
  const day = date.getDay()
  // If it's Sunday (0), move to Monday (1)
  if (day === 0) {
    date.setDate(date.getDate() + 1)
  }
  return date
}

// =============================================================================
// CHALLENGE FIXTURES
// =============================================================================

export const mockChallenge = {
  id: 'challenge-test-001',
  gymId: mockGym.id,
  name: 'Zimski Izazov',
  description: 'Održi formu tokom zime!',
  rewardDescription: 'Top 3: Mesečna članarina gratis',
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Started 7 days ago
  endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000), // Ends in 23 days
  joinDeadlineDays: 14,
  winnerCount: 3,
  status: 'registration',
  pointsPerMeal: 5,
  pointsPerTraining: 15,
  pointsPerWater: 1,
  pointsPerCheckin: 25,
  streakBonus: 5,
  excludeTopN: 3,
  winnerCooldownMonths: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockDraftChallenge = {
  ...mockChallenge,
  id: 'challenge-test-002',
  name: 'Draft Challenge',
  status: 'draft',
}

export const mockUpcomingChallenge = {
  ...mockChallenge,
  id: 'challenge-test-003',
  name: 'Upcoming Challenge',
  status: 'registration',
  startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Starts in 14 days
  endDate: new Date(Date.now() + 44 * 24 * 60 * 60 * 1000), // Ends in 44 days
}

export const mockEndedChallenge = {
  ...mockChallenge,
  id: 'challenge-test-004',
  name: 'Ended Challenge',
  status: 'ended',
  startDate: new Date(Date.now() - 37 * 24 * 60 * 60 * 1000), // Started 37 days ago
  endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Ended 7 days ago
}

export const mockChallengeParticipant = {
  id: 'participant-test-001',
  challengeId: mockChallenge.id,
  memberId: mockMember.id,
  totalPoints: 145,
  mealPoints: 60,
  trainingPoints: 45,
  waterPoints: 20,
  checkinPoints: 0,
  streakPoints: 20,
  currentStreak: 4,
  lastActiveDate: new Date(),
  joinedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Joined 5 days ago
}

export const mockChallengeWithParticipants = {
  ...mockChallenge,
  _count: { participants: 5 },
  participants: [mockChallengeParticipant],
}

export const mockChallengeLeaderboard = [
  {
    ...mockChallengeParticipant,
    member: { id: mockMember.id, name: mockMember.name, avatarUrl: null },
  },
  {
    ...mockChallengeParticipant,
    id: 'participant-test-002',
    memberId: 'member-test-002',
    totalPoints: 128,
    mealPoints: 50,
    trainingPoints: 45,
    waterPoints: 18,
    streakPoints: 15,
    member: { id: 'member-test-002', name: 'Ana Anic', avatarUrl: null },
  },
]

// Recent winner (within cooldown period)
export const mockChallengeWinner = {
  id: 'winner-test-001',
  challengeId: mockEndedChallenge.id,
  memberId: mockMember.id,
  rank: 1,
  totalPoints: 245,
  wonAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Won 30 days ago (within 3 month cooldown)
  challenge: {
    name: mockEndedChallenge.name,
    gymId: mockGym.id,
  },
}

// Old winner (outside cooldown period)
export const mockOldChallengeWinner = {
  ...mockChallengeWinner,
  id: 'winner-test-002',
  wonAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // Won 120 days ago (outside 3 month cooldown)
}

// =============================================================================
// GYM CHECK-IN FIXTURES
// =============================================================================

export const mockGymWithCheckin = {
  ...mockGym,
  checkinSecret: 'test-checkin-secret-uuid',
}

export const mockGymWithoutCheckin = {
  ...mockGym,
  checkinSecret: null,
}

export const mockGymCheckin = {
  id: 'checkin-gym-001',
  memberId: mockMember.id,
  gymId: mockGym.id,
  date: new Date(new Date().setUTCHours(0, 0, 0, 0)), // Today's date at midnight
  createdAt: new Date(),
}

// =============================================================================
// SESSION SCHEDULING FIXTURES
// =============================================================================

export const mockSessionRequest = {
  id: 'session-request-001',
  staffId: mockStaffCoach.id,
  memberId: mockMember.id,
  sessionType: 'training',
  proposedAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
  duration: 60,
  location: 'gym',
  note: 'Upper body focus',
  initiatedBy: 'coach',
  status: 'pending',
  counterCount: 0,
  lastActionBy: 'coach',
  lastActionAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockSessionRequestFromMember = {
  ...mockSessionRequest,
  id: 'session-request-002',
  initiatedBy: 'member',
  lastActionBy: 'member',
  note: 'Would like to discuss my progress',
}

export const mockSessionRequestCountered = {
  ...mockSessionRequest,
  id: 'session-request-003',
  status: 'countered',
  counterCount: 1,
  lastActionBy: 'member',
}

export const mockSessionRequestWithRelations = {
  ...mockSessionRequest,
  staff: {
    id: mockStaffCoach.id,
    name: mockStaffCoach.name,
    avatarUrl: null,
  },
  member: {
    id: mockMember.id,
    name: mockMember.name,
    avatarUrl: null,
    memberId: mockMember.memberId,
  },
  proposalHistory: [],
}

export const mockSessionProposal = {
  id: 'proposal-001',
  sessionRequestId: mockSessionRequest.id,
  proposedBy: 'coach',
  proposedAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  duration: 60,
  location: 'gym',
  note: 'Upper body focus',
  response: null,
  responseAt: null,
  createdAt: new Date(),
}

export const mockScheduledSession = {
  id: 'scheduled-session-001',
  staffId: mockStaffCoach.id,
  memberId: mockMember.id,
  sessionType: 'training',
  scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
  duration: 60,
  location: 'gym',
  note: 'Confirmed training session',
  status: 'confirmed',
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockScheduledSessionWithRelations = {
  ...mockScheduledSession,
  staff: {
    id: mockStaffCoach.id,
    name: mockStaffCoach.name,
    avatarUrl: null,
  },
  member: {
    id: mockMember.id,
    name: mockMember.name,
    avatarUrl: null,
    memberId: mockMember.memberId,
  },
}

export const mockPastSession = {
  ...mockScheduledSession,
  id: 'scheduled-session-002',
  scheduledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
  status: 'completed',
  completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
}

export const mockCancelledSession = {
  ...mockScheduledSession,
  id: 'scheduled-session-003',
  status: 'cancelled',
  cancelledAt: new Date(),
  cancelledBy: 'member',
  cancellationReason: 'Need to reschedule due to schedule conflict',
}

// =============================================================================
// CUSTOM METRICS FIXTURES
// =============================================================================

export const mockCustomMetric = {
  id: 'metric-test-001',
  memberId: mockMember.id,
  createdByCoachId: null,
  name: 'Bench Press',
  unit: 'kg',
  targetValue: 100,
  referenceValue: 60,
  higherIsBetter: true,
  createdAt: new Date('2024-12-01'),
  updatedAt: new Date('2024-12-01'),
}

export const mockCoachCreatedMetric = {
  ...mockCustomMetric,
  id: 'metric-test-002',
  name: 'Body Fat %',
  unit: '%',
  targetValue: 15,
  referenceValue: 20,
  higherIsBetter: false,
  createdByCoachId: mockStaffCoach.id,
}

export const mockMetricNoTarget = {
  ...mockCustomMetric,
  id: 'metric-test-003',
  name: 'Hip Mobility',
  unit: 'cm',
  targetValue: null,
  referenceValue: null,
  higherIsBetter: true,
}

export const mockCustomMetricWithCoach = {
  ...mockCoachCreatedMetric,
  createdByCoach: {
    name: mockStaffCoach.name,
  },
}

export const mockCustomMetricWithoutCoach = {
  ...mockCustomMetric,
  createdByCoach: null,
}

export const mockMetricEntry = {
  id: 'entry-test-001',
  metricId: mockCustomMetric.id,
  memberId: mockMember.id,
  date: new Date('2024-12-15'),
  value: 75,
  note: 'Good progress',
  createdAt: new Date('2024-12-15'),
  updatedAt: new Date('2024-12-15'),
}

export const mockMetricEntryLatest = {
  ...mockMetricEntry,
  id: 'entry-test-002',
  date: new Date('2024-12-20'),
  value: 80,
  note: 'New PR! 💪',
}

export const mockMetricEntryFirst = {
  ...mockMetricEntry,
  id: 'entry-test-003',
  date: new Date('2024-12-01'),
  value: 60,
  note: 'Starting value',
}

export const mockMetricEntryBodyFat = {
  ...mockMetricEntry,
  id: 'entry-test-004',
  metricId: mockCoachCreatedMetric.id,
  date: new Date('2024-12-15'),
  value: 18.5,
  note: 'Down from 20%',
}

export const mockMetricWithEntries = {
  ...mockCustomMetric,
  createdByCoach: null,
  entries: [mockMetricEntryLatest],
  _count: { entries: 3 },
}

export const mockCoachMetricWithEntries = {
  ...mockCoachCreatedMetric,
  createdByCoach: { name: mockStaffCoach.name },
  entries: [mockMetricEntryBodyFat],
  _count: { entries: 5 },
}

// Mapped entry format (as returned by API)
export const mockMappedMetricEntry = {
  id: mockMetricEntry.id,
  date: '2024-12-15',
  value: 75,
  note: 'Good progress',
  status: 'needs_attention' as const,
  changeFromReference: 25, // 25% increase from 60
  changeIsAbsolute: false,
}

export const mockMappedMetricEntryBodyFat = {
  id: mockMetricEntryBodyFat.id,
  date: '2024-12-15',
  value: 18.5,
  note: 'Down from 20%',
  status: 'needs_attention' as const,
  changeFromReference: -1.5, // Absolute change for % units
  changeIsAbsolute: true,
}

export const mockMetricDetailResponse = {
  metric: {
    id: mockCustomMetric.id,
    name: mockCustomMetric.name,
    unit: mockCustomMetric.unit,
    targetValue: mockCustomMetric.targetValue,
    referenceValue: mockCustomMetric.referenceValue,
    higherIsBetter: mockCustomMetric.higherIsBetter,
    isCoachCreated: false,
    coachName: null,
  },
  entries: [mockMappedMetricEntry],
  range: 30,
}

export const mockMetricListResponse = {
  own: [
    {
      id: mockCustomMetric.id,
      name: mockCustomMetric.name,
      unit: mockCustomMetric.unit,
      targetValue: mockCustomMetric.targetValue,
      referenceValue: mockCustomMetric.referenceValue,
      higherIsBetter: mockCustomMetric.higherIsBetter,
      isCoachCreated: false,
      coachName: null,
      entryCount: 3,
      latestEntry: { value: 80, date: '2024-12-20' },
      createdAt: mockCustomMetric.createdAt.toISOString(),
    },
  ],
  coach: [
    {
      id: mockCoachCreatedMetric.id,
      name: mockCoachCreatedMetric.name,
      unit: mockCoachCreatedMetric.unit,
      targetValue: mockCoachCreatedMetric.targetValue,
      referenceValue: mockCoachCreatedMetric.referenceValue,
      higherIsBetter: mockCoachCreatedMetric.higherIsBetter,
      isCoachCreated: true,
      coachName: mockStaffCoach.name,
      entryCount: 5,
      latestEntry: { value: 18.5, date: '2024-12-15' },
      createdAt: mockCoachCreatedMetric.createdAt.toISOString(),
    },
  ],
}

// =============================================================================
// GOAL VOTING SYSTEM FIXTURES
// =============================================================================

export const mockGoalOption1 = {
  id: 'option-test-001',
  goalId: 'goal-test-001',
  name: 'Squat Rack',
  description: 'Professional squat rack for strength training',
  imageUrl: null,
  targetAmount: 200000, // 2000€ in cents
  voteCount: 5,
  displayOrder: 0,
  createdAt: new Date('2024-12-01'),
}

export const mockGoalOption2 = {
  id: 'option-test-002',
  goalId: 'goal-test-001',
  name: 'New Mats',
  description: 'High-quality floor mats for the gym',
  imageUrl: null,
  targetAmount: 50000, // 500€ in cents
  voteCount: 3,
  displayOrder: 1,
  createdAt: new Date('2024-12-01'),
}

export const mockGoalOption3 = {
  id: 'option-test-003',
  goalId: 'goal-test-001',
  name: 'Bench Press',
  description: 'Olympic bench press station',
  imageUrl: null,
  targetAmount: 150000, // 1500€ in cents
  voteCount: 2,
  displayOrder: 2,
  createdAt: new Date('2024-12-01'),
}

export const mockGoalVoting = {
  id: 'goal-test-001',
  gymId: mockGym.id,
  name: 'Q1 2026 Equipment Upgrade',
  description: 'Vote for the equipment you want most!',
  status: 'voting',
  votingEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  winningOptionId: null,
  currentAmount: 0,
  isVisible: true,
  createdAt: new Date('2024-12-01'),
  updatedAt: new Date('2024-12-01'),
  votingEndedAt: null,
  completedAt: null,
}

export const mockGoalVotingWithOptions = {
  ...mockGoalVoting,
  options: [mockGoalOption1, mockGoalOption2, mockGoalOption3],
  _count: { votes: 10, contributions: 0 },
}

export const mockGoalDraft = {
  ...mockGoalVoting,
  id: 'goal-test-002',
  name: 'Draft Goal',
  status: 'draft',
  votingEndsAt: null,
  _count: { votes: 0, contributions: 0 },
}

export const mockGoalFundraising = {
  ...mockGoalVoting,
  id: 'goal-test-003',
  name: 'Fundraising Goal',
  status: 'fundraising',
  votingEndsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Ended 7 days ago
  votingEndedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  winningOptionId: 'option-test-004',
  currentAmount: 50000, // 500€ in cents
}

export const mockGoalFundraisingOption = {
  id: 'option-test-004',
  goalId: 'goal-test-003',
  name: 'Cardio Equipment',
  description: 'New treadmill for cardio workouts',
  imageUrl: null,
  targetAmount: 100000, // 1000€ in cents
  voteCount: 8,
  displayOrder: 0,
  createdAt: new Date('2024-12-01'),
}

export const mockGoalFundraisingWithOption = {
  ...mockGoalFundraising,
  options: [mockGoalFundraisingOption],
  _count: { votes: 8, contributions: 5 },
}

export const mockGoalCompleted = {
  ...mockGoalFundraising,
  id: 'goal-test-004',
  name: 'Completed Goal',
  status: 'completed',
  currentAmount: 100000, // 1000€ - met the target
  completedAt: new Date('2024-12-15'),
}

export const mockGoalSingleOption = {
  ...mockGoalVoting,
  id: 'goal-test-005',
  name: 'Single Option Goal',
  status: 'fundraising', // Single-option goes straight to fundraising
  votingEndsAt: null,
  winningOptionId: 'option-test-005',
  currentAmount: 25000, // 250€
}

export const mockSingleGoalOption = {
  id: 'option-test-005',
  goalId: 'goal-test-005',
  name: 'New Dumbbells',
  description: 'Set of rubber hex dumbbells',
  imageUrl: null,
  targetAmount: 80000, // 800€ in cents
  voteCount: 0,
  displayOrder: 0,
  createdAt: new Date('2024-12-01'),
}

export const mockGoalVote = {
  id: 'vote-test-001',
  goalId: mockGoalVoting.id,
  optionId: mockGoalOption1.id,
  memberId: mockMember.id,
  createdAt: new Date('2024-12-05'),
  updatedAt: new Date('2024-12-05'),
}

export const mockGoalVote2 = {
  id: 'vote-test-002',
  goalId: mockGoalVoting.id,
  optionId: mockGoalOption2.id,
  memberId: 'member-test-002',
  createdAt: new Date('2024-12-06'),
  updatedAt: new Date('2024-12-06'),
}

export const mockGoalContribution = {
  id: 'contribution-test-001',
  goalId: mockGoalFundraising.id,
  amount: 500, // 5€ in cents
  source: 'subscription',
  memberId: mockMember.id,
  memberName: mockMember.name,
  note: '1-mesečna članarina',
  createdAt: new Date('2024-12-10'),
}

export const mockGoalContributionManual = {
  id: 'contribution-test-002',
  goalId: mockGoalFundraising.id,
  amount: 10000, // 100€ in cents
  source: 'manual',
  memberId: null,
  memberName: null,
  note: 'Donacija od sponzora',
  createdAt: new Date('2024-12-11'),
}

export const mockExpiredVotingGoal = {
  ...mockGoalVoting,
  id: 'goal-test-expired',
  name: 'Expired Voting Goal',
  votingEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
}

// =============================================================================
// SHOP/INVENTORY MANAGEMENT FIXTURES
// =============================================================================

export const mockProduct = {
  id: 'product-test-001',
  gymId: mockGym.id,
  name: 'Whey Protein 2kg',
  description: 'Premium whey protein isolate',
  sku: 'WP-001',
  imageUrl: 'data:image/svg+xml;base64,mockImage',
  category: 'protein',
  price: 5990, // 5990 RSD
  costPrice: 4500,
  currentStock: 15,
  lowStockAlert: 5,
  isActive: true,
  createdAt: new Date('2024-12-01'),
  updatedAt: new Date('2024-12-01'),
}

export const mockProductLowStock = {
  ...mockProduct,
  id: 'product-test-002',
  name: 'Creatine 500g',
  sku: 'CR-001',
  category: 'creatine',
  price: 2490,
  currentStock: 3,
  lowStockAlert: 5,
}

export const mockProductOutOfStock = {
  ...mockProduct,
  id: 'product-test-003',
  name: 'BCAA Powder',
  sku: 'BC-001',
  category: 'bcaa',
  price: 1990,
  currentStock: 0,
  lowStockAlert: 3,
}

export const mockProductInactive = {
  ...mockProduct,
  id: 'product-test-004',
  name: 'Discontinued Supplement',
  sku: 'DS-001',
  category: 'other',
  price: 990,
  isActive: false,
}

export const mockProductWithSales = {
  ...mockProduct,
  _count: { sales: 5 },
  stockLogs: [],
}

export const mockStockLog = {
  id: 'stocklog-test-001',
  productId: mockProduct.id,
  type: 'purchase',
  quantity: 10,
  note: 'Supplier delivery',
  staffId: mockStaffAdmin.id,
  staffName: mockStaffAdmin.name,
  previousStock: 5,
  newStock: 15,
  createdAt: new Date('2024-12-10'),
}

export const mockStockLogSale = {
  ...mockStockLog,
  id: 'stocklog-test-002',
  type: 'sale',
  quantity: -2,
  note: 'Prodaja #abc123',
  previousStock: 17,
  newStock: 15,
}

export const mockStockLogAdjustment = {
  ...mockStockLog,
  id: 'stocklog-test-003',
  type: 'adjustment',
  quantity: -1,
  note: 'Inventory correction',
  previousStock: 16,
  newStock: 15,
}

export const mockSale = {
  id: 'sale-test-001',
  productId: mockProduct.id,
  gymId: mockGym.id,
  quantity: 2,
  unitPrice: 5990,
  totalAmount: 11980,
  memberId: mockMember.id,
  memberName: mockMember.name,
  staffId: mockStaffAdmin.id,
  staffName: mockStaffAdmin.name,
  paymentMethod: 'cash',
  createdAt: new Date('2024-12-15'),
}

export const mockSaleWithProduct = {
  ...mockSale,
  product: {
    id: mockProduct.id,
    name: mockProduct.name,
    category: mockProduct.category,
  },
}

export const mockSaleNoMember = {
  ...mockSale,
  id: 'sale-test-002',
  memberId: null,
  memberName: null,
}

export const mockSaleCard = {
  ...mockSale,
  id: 'sale-test-003',
  paymentMethod: 'card',
}
