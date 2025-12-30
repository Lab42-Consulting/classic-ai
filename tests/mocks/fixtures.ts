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
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
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
  hasSeenOnboarding: true,
  trialStartDate: new Date('2024-12-01'),
  trialEndDate: new Date('2024-12-08'),
  subscriptionStatus: 'active',
  subscriptionEndDate: new Date('2025-12-01'),
  gymId: 'gym-test-001',
  createdAt: new Date('2024-12-01'),
  updatedAt: new Date('2024-12-01'),
}

export const mockMemberWithGym = {
  ...mockMember,
  gym: mockGym,
}

export const mockTrialMember = {
  ...mockMember,
  id: 'member-test-002',
  memberId: 'TRL001',
  name: 'Trial User',
  subscriptionStatus: 'trial',
  subscriptionEndDate: null,
  trialEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
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
  gymId: 'gym-test-001',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
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
  customGoal: null,
  customCalories: 1800,
  customProtein: 150,
  customCarbs: null,
  customFats: null,
  notes: 'Focus on fat loss with high protein',
  requireExactMacros: false,
  createdAt: new Date('2024-12-01'),
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
}

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
