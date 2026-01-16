import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as metricsGet, POST as metricsPost } from '@/app/api/member/metrics/route'
import { PATCH as metricPatch, DELETE as metricDelete } from '@/app/api/member/metrics/[id]/route'
import { GET as entriesGet, POST as entriesPost } from '@/app/api/member/metrics/[id]/entries/route'
import { GET as coachMetricsGet, POST as coachMetricsPost } from '@/app/api/coach/member-metrics/[memberId]/route'
import prisma from '@/lib/db'
import { getSession, getMemberFromSession } from '@/lib/auth'
import {
  mockMember,
  mockStaffCoach,
  mockMemberAuthResult,
  mockNoSessionError,
  mockStaffSession,
  mockCustomMetric,
  mockCoachCreatedMetric,
  mockMetricNoTarget,
  mockMetricEntry,
  mockMetricEntryLatest,
  mockMetricEntryFirst,
  mockMetricWithEntries,
  mockCoachMetricWithEntries,
  createMockRequest,
  createMockGetRequest,
} from '../mocks/fixtures'

describe('Metrics API', () => {
  // =========================================================================
  // GET /api/member/metrics - Get Member Metrics
  // =========================================================================
  describe('GET /api/member/metrics - Get Member Metrics', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockNoSessionError)

        const request = createMockGetRequest()
        const response = await metricsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('NO_SESSION')
      })
    })

    describe('Get All Metrics', () => {
      it('should return own and coach-created metrics', async () => {
        const allMetrics = [
          { ...mockMetricWithEntries, createdByCoachId: null },
          { ...mockCoachMetricWithEntries, createdByCoachId: mockStaffCoach.id },
        ]
        vi.mocked(prisma.customMetric.findMany).mockResolvedValue(allMetrics as never)

        const request = createMockGetRequest()
        const response = await metricsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.own).toBeDefined()
        expect(data.coach).toBeDefined()
        expect(data.own.length).toBe(1)
        expect(data.coach.length).toBe(1)
      })

      it('should return empty arrays when no metrics exist', async () => {
        vi.mocked(prisma.customMetric.findMany).mockResolvedValue([])

        const request = createMockGetRequest()
        const response = await metricsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.own).toEqual([])
        expect(data.coach).toEqual([])
      })
    })
  })

  // =========================================================================
  // POST /api/member/metrics - Create Member Metric
  // =========================================================================
  describe('POST /api/member/metrics - Create Member Metric', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockNoSessionError)

        const request = createMockRequest({
          name: 'Bench Press',
          unit: 'kg',
        })
        const response = await metricsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('NO_SESSION')
      })
    })

    describe('Validation', () => {
      it('should return 400 if name is missing', async () => {
        const request = createMockRequest({
          name: '',
          unit: 'kg',
        })
        const response = await metricsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Naziv')
      })

      it('should return 400 if unit is missing', async () => {
        const request = createMockRequest({
          name: 'Bench Press',
          unit: '',
        })
        const response = await metricsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Jedinica')
      })
    })

    describe('Successful Creation', () => {
      it('should create metric with target value', async () => {
        vi.mocked(prisma.customMetric.create).mockResolvedValue(mockCustomMetric as never)

        const request = createMockRequest({
          name: 'Bench Press',
          unit: 'kg',
          targetValue: 100,
          higherIsBetter: true,
        })
        const response = await metricsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.metric).toBeDefined()
      })

      it('should create metric without target (neutral display)', async () => {
        vi.mocked(prisma.customMetric.create).mockResolvedValue(mockMetricNoTarget as never)

        const request = createMockRequest({
          name: 'Hip Mobility',
          unit: 'cm',
          higherIsBetter: true,
        })
        const response = await metricsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.metric.targetValue).toBeNull()
      })

      it('should create metric with higherIsBetter false (e.g., body fat)', async () => {
        const bodyFatMetric = { ...mockCustomMetric, unit: '%', higherIsBetter: false }
        vi.mocked(prisma.customMetric.create).mockResolvedValue(bodyFatMetric as never)

        const request = createMockRequest({
          name: 'Body Fat %',
          unit: '%',
          targetValue: 15,
          higherIsBetter: false,
        })
        const response = await metricsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.metric.higherIsBetter).toBe(false)
      })
    })
  })

  // =========================================================================
  // PATCH /api/member/metrics/[id] - Update Member Metric
  // =========================================================================
  describe('PATCH /api/member/metrics/[id] - Update Member Metric', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
    })

    describe('Authorization', () => {
      it('should return 403 when trying to edit coach-created metric', async () => {
        vi.mocked(prisma.customMetric.findUnique).mockResolvedValue(mockCoachCreatedMetric as never)

        const request = createMockRequest({ name: 'New Name' }, 'PATCH')
        const response = await metricPatch(request as never, { params: Promise.resolve({ id: mockCoachCreatedMetric.id }) })
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toContain('trener')
      })

      it('should return 404 if metric not found', async () => {
        vi.mocked(prisma.customMetric.findUnique).mockResolvedValue(null)

        const request = createMockRequest({ name: 'New Name' }, 'PATCH')
        const response = await metricPatch(request as never, { params: Promise.resolve({ id: 'non-existent' }) })
        const data = await response.json()

        expect(response.status).toBe(404)
      })
    })

    describe('Successful Update', () => {
      it('should update own metric', async () => {
        vi.mocked(prisma.customMetric.findUnique).mockResolvedValue(mockCustomMetric as never)
        vi.mocked(prisma.customMetric.update).mockResolvedValue({
          ...mockCustomMetric,
          name: 'Updated Name',
          createdByCoach: null,
          _count: { entries: 3 },
          entries: [mockMetricEntryLatest],
        } as never)

        const request = createMockRequest({ name: 'Updated Name' }, 'PATCH')
        const response = await metricPatch(request as never, { params: Promise.resolve({ id: mockCustomMetric.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })
  })

  // =========================================================================
  // DELETE /api/member/metrics/[id] - Delete Member Metric
  // =========================================================================
  describe('DELETE /api/member/metrics/[id] - Delete Member Metric', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
    })

    describe('Authorization', () => {
      it('should return 403 when trying to delete coach-created metric', async () => {
        vi.mocked(prisma.customMetric.findUnique).mockResolvedValue(mockCoachCreatedMetric as never)

        const request = createMockRequest({}, 'DELETE')
        const response = await metricDelete(request as never, { params: Promise.resolve({ id: mockCoachCreatedMetric.id }) })
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toContain('trener')
      })
    })

    describe('Successful Delete', () => {
      it('should delete own metric', async () => {
        vi.mocked(prisma.customMetric.findUnique).mockResolvedValue(mockCustomMetric as never)
        vi.mocked(prisma.customMetric.delete).mockResolvedValue(mockCustomMetric as never)

        const request = createMockRequest({}, 'DELETE')
        const response = await metricDelete(request as never, { params: Promise.resolve({ id: mockCustomMetric.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })
  })

  // =========================================================================
  // GET /api/member/metrics/[id]/entries - Get Metric Entries
  // =========================================================================
  describe('GET /api/member/metrics/[id]/entries - Get Metric Entries', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
    })

    describe('Get Entries with Time Range', () => {
      it('should return entries with status and change calculations', async () => {
        vi.mocked(prisma.customMetric.findUnique).mockResolvedValue({
          ...mockCustomMetric,
          createdByCoach: null,
        } as never)
        vi.mocked(prisma.metricEntry.findMany).mockResolvedValue([
          mockMetricEntryLatest,
          mockMetricEntry,
        ] as never)
        vi.mocked(prisma.metricEntry.findFirst).mockResolvedValue(mockMetricEntryFirst as never)

        const request = createMockGetRequest({ range: '30' })
        const response = await entriesGet(request as never, { params: Promise.resolve({ id: mockCustomMetric.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.metric).toBeDefined()
        expect(data.entries).toBeDefined()
        expect(data.range).toBe(30)
      })

      it('should use first entry as reference if no explicit reference set', async () => {
        const metricNoRef = { ...mockCustomMetric, referenceValue: null, createdByCoach: null }
        vi.mocked(prisma.customMetric.findUnique).mockResolvedValue(metricNoRef as never)
        vi.mocked(prisma.metricEntry.findMany).mockResolvedValue([mockMetricEntry] as never)
        vi.mocked(prisma.metricEntry.findFirst).mockResolvedValue(mockMetricEntryFirst as never)

        const request = createMockGetRequest({ range: '30' })
        const response = await entriesGet(request as never, { params: Promise.resolve({ id: mockCustomMetric.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.metric.referenceValue).toBe(mockMetricEntryFirst.value)
      })
    })

    describe('Change Calculation Logic', () => {
      it('should return percentage change for regular units', async () => {
        vi.mocked(prisma.customMetric.findUnique).mockResolvedValue({
          ...mockCustomMetric,
          unit: 'kg',
          referenceValue: 60,
          createdByCoach: null,
        } as never)
        vi.mocked(prisma.metricEntry.findMany).mockResolvedValue([
          { ...mockMetricEntry, value: 75 },
        ] as never)
        vi.mocked(prisma.metricEntry.findFirst).mockResolvedValue(mockMetricEntryFirst as never)

        const request = createMockGetRequest({ range: '30' })
        const response = await entriesGet(request as never, { params: Promise.resolve({ id: mockCustomMetric.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.entries[0].changeIsAbsolute).toBe(false)
        // 75 from 60 = 25% increase
        expect(data.entries[0].changeFromReference).toBeCloseTo(25, 1)
      })

      it('should return absolute change for percentage units', async () => {
        vi.mocked(prisma.customMetric.findUnique).mockResolvedValue({
          ...mockCoachCreatedMetric,
          unit: '%',
          referenceValue: 20,
          createdByCoach: { name: mockStaffCoach.name },
        } as never)
        vi.mocked(prisma.metricEntry.findMany).mockResolvedValue([
          { ...mockMetricEntry, value: 18.5 },
        ] as never)
        vi.mocked(prisma.metricEntry.findFirst).mockResolvedValue({ ...mockMetricEntryFirst, value: 20 } as never)

        const request = createMockGetRequest({ range: '30' })
        const response = await entriesGet(request as never, { params: Promise.resolve({ id: mockCoachCreatedMetric.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.entries[0].changeIsAbsolute).toBe(true)
        // 18.5 from 20 = -1.5 percentage points
        expect(data.entries[0].changeFromReference).toBeCloseTo(-1.5, 1)
      })
    })
  })

  // =========================================================================
  // POST /api/member/metrics/[id]/entries - Create/Update Entry
  // =========================================================================
  describe('POST /api/member/metrics/[id]/entries - Create/Update Entry', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
    })

    describe('Validation', () => {
      it('should return 400 if date is missing', async () => {
        vi.mocked(prisma.customMetric.findUnique).mockResolvedValue(mockCustomMetric as never)

        const request = createMockRequest({
          value: 80,
        })
        const response = await entriesPost(request as never, { params: Promise.resolve({ id: mockCustomMetric.id }) })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Datum')
      })

      it('should return 400 if value is missing', async () => {
        vi.mocked(prisma.customMetric.findUnique).mockResolvedValue(mockCustomMetric as never)

        const request = createMockRequest({
          date: '2024-12-20',
        })
        const response = await entriesPost(request as never, { params: Promise.resolve({ id: mockCustomMetric.id }) })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Vrednost')
      })
    })

    describe('Successful Creation', () => {
      it('should create new entry', async () => {
        vi.mocked(prisma.customMetric.findUnique).mockResolvedValue(mockCustomMetric as never)
        vi.mocked(prisma.metricEntry.findUnique).mockResolvedValue(null) // No existing entry
        vi.mocked(prisma.metricEntry.create).mockResolvedValue(mockMetricEntry as never)
        vi.mocked(prisma.metricEntry.findFirst).mockResolvedValue(mockMetricEntryFirst as never)

        const request = createMockRequest({
          date: '2024-12-15',
          value: 75,
          note: 'Good progress',
        })
        const response = await entriesPost(request as never, { params: Promise.resolve({ id: mockCustomMetric.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.isUpdate).toBe(false)
      })

      it('should update existing entry (upsert)', async () => {
        vi.mocked(prisma.customMetric.findUnique).mockResolvedValue(mockCustomMetric as never)
        vi.mocked(prisma.metricEntry.findUnique).mockResolvedValue(mockMetricEntry as never) // Existing entry
        vi.mocked(prisma.metricEntry.update).mockResolvedValue({ ...mockMetricEntry, value: 78 } as never)
        vi.mocked(prisma.metricEntry.findFirst).mockResolvedValue(mockMetricEntryFirst as never)

        const request = createMockRequest({
          date: '2024-12-15',
          value: 78,
          note: 'Updated value',
        })
        const response = await entriesPost(request as never, { params: Promise.resolve({ id: mockCustomMetric.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.isUpdate).toBe(true)
      })
    })
  })

  // =========================================================================
  // GET /api/coach/member-metrics/[memberId] - Coach Get Member Metrics
  // =========================================================================
  describe('GET /api/coach/member-metrics/[memberId] - Coach Get Member Metrics', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)
      vi.mocked(prisma.coachAssignment.findFirst).mockResolvedValue({
        staffId: mockStaffCoach.id,
        memberId: mockMember.id,
      } as never)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const request = createMockGetRequest()
        const response = await coachMetricsGet(request as never, { params: Promise.resolve({ memberId: mockMember.id }) })
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 403 if not assigned to member', async () => {
        vi.mocked(prisma.coachAssignment.findFirst).mockResolvedValue(null)

        const request = createMockGetRequest()
        const response = await coachMetricsGet(request as never, { params: Promise.resolve({ memberId: mockMember.id }) })
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toContain('not assigned')
      })
    })

    describe('Get Member Metrics', () => {
      it('should return coach-created and member-created metrics separately', async () => {
        const allMetrics = [
          { ...mockMetricWithEntries, createdByCoachId: mockStaffCoach.id },
          { ...mockMetricWithEntries, id: 'metric-member', createdByCoachId: null },
        ]
        vi.mocked(prisma.customMetric.findMany).mockResolvedValue(allMetrics as never)

        const request = createMockGetRequest()
        const response = await coachMetricsGet(request as never, { params: Promise.resolve({ memberId: mockMember.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.coachCreated).toBeDefined()
        expect(data.memberCreated).toBeDefined()
      })
    })
  })

  // =========================================================================
  // POST /api/coach/member-metrics/[memberId] - Coach Create Metric
  // =========================================================================
  describe('POST /api/coach/member-metrics/[memberId] - Coach Create Metric', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)
      vi.mocked(prisma.coachAssignment.findFirst).mockResolvedValue({
        staffId: mockStaffCoach.id,
        memberId: mockMember.id,
      } as never)
    })

    describe('Successful Creation', () => {
      it('should create metric for member with createdByCoachId set', async () => {
        vi.mocked(prisma.customMetric.create).mockResolvedValue(mockCoachCreatedMetric as never)

        const request = createMockRequest({
          name: 'Body Fat %',
          unit: '%',
          targetValue: 15,
          referenceValue: 20,
          higherIsBetter: false,
        })
        const response = await coachMetricsPost(request as never, { params: Promise.resolve({ memberId: mockMember.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(prisma.customMetric.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              createdByCoachId: mockStaffCoach.id,
              memberId: mockMember.id,
            }),
          })
        )
      })
    })
  })

  // =========================================================================
  // STATUS CALCULATION TESTS
  // =========================================================================
  describe('Status Calculation Logic', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
    })

    it('should return on_track when value meets target (higher is better)', async () => {
      vi.mocked(prisma.customMetric.findUnique).mockResolvedValue({
        ...mockCustomMetric,
        targetValue: 80,
        higherIsBetter: true,
        createdByCoach: null,
      } as never)
      vi.mocked(prisma.metricEntry.findMany).mockResolvedValue([
        { ...mockMetricEntry, value: 85 }, // Above target
      ] as never)
      vi.mocked(prisma.metricEntry.findFirst).mockResolvedValue(mockMetricEntryFirst as never)

      const request = createMockGetRequest({ range: '30' })
      const response = await entriesGet(request as never, { params: Promise.resolve({ id: mockCustomMetric.id }) })
      const data = await response.json()

      expect(data.entries[0].status).toBe('on_track')
    })

    it('should return needs_attention when within 10% of target', async () => {
      vi.mocked(prisma.customMetric.findUnique).mockResolvedValue({
        ...mockCustomMetric,
        targetValue: 100,
        higherIsBetter: true,
        createdByCoach: null,
      } as never)
      vi.mocked(prisma.metricEntry.findMany).mockResolvedValue([
        { ...mockMetricEntry, value: 92 }, // Within 10% (90-100)
      ] as never)
      vi.mocked(prisma.metricEntry.findFirst).mockResolvedValue(mockMetricEntryFirst as never)

      const request = createMockGetRequest({ range: '30' })
      const response = await entriesGet(request as never, { params: Promise.resolve({ id: mockCustomMetric.id }) })
      const data = await response.json()

      expect(data.entries[0].status).toBe('needs_attention')
    })

    it('should return off_track when more than 10% below target', async () => {
      vi.mocked(prisma.customMetric.findUnique).mockResolvedValue({
        ...mockCustomMetric,
        targetValue: 100,
        higherIsBetter: true,
        createdByCoach: null,
      } as never)
      vi.mocked(prisma.metricEntry.findMany).mockResolvedValue([
        { ...mockMetricEntry, value: 80 }, // Below 90 (10% threshold)
      ] as never)
      vi.mocked(prisma.metricEntry.findFirst).mockResolvedValue(mockMetricEntryFirst as never)

      const request = createMockGetRequest({ range: '30' })
      const response = await entriesGet(request as never, { params: Promise.resolve({ id: mockCustomMetric.id }) })
      const data = await response.json()

      expect(data.entries[0].status).toBe('off_track')
    })

    it('should return neutral when no target is set', async () => {
      vi.mocked(prisma.customMetric.findUnique).mockResolvedValue({
        ...mockMetricNoTarget,
        targetValue: null,
        createdByCoach: null,
      } as never)
      vi.mocked(prisma.metricEntry.findMany).mockResolvedValue([mockMetricEntry] as never)
      vi.mocked(prisma.metricEntry.findFirst).mockResolvedValue(mockMetricEntryFirst as never)

      const request = createMockGetRequest({ range: '30' })
      const response = await entriesGet(request as never, { params: Promise.resolve({ id: mockMetricNoTarget.id }) })
      const data = await response.json()

      expect(data.entries[0].status).toBe('neutral')
    })

    it('should return on_track when below target (lower is better)', async () => {
      vi.mocked(prisma.customMetric.findUnique).mockResolvedValue({
        ...mockCoachCreatedMetric,
        targetValue: 15,
        higherIsBetter: false,
        createdByCoach: { name: mockStaffCoach.name },
      } as never)
      vi.mocked(prisma.metricEntry.findMany).mockResolvedValue([
        { ...mockMetricEntry, value: 14 }, // Below target (good for lower is better)
      ] as never)
      vi.mocked(prisma.metricEntry.findFirst).mockResolvedValue(mockMetricEntryFirst as never)

      const request = createMockGetRequest({ range: '30' })
      const response = await entriesGet(request as never, { params: Promise.resolve({ id: mockCoachCreatedMetric.id }) })
      const data = await response.json()

      expect(data.entries[0].status).toBe('on_track')
    })
  })
})
