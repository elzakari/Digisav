import type { PrismaClient } from '@prisma/client';
import { GroupService } from '@/services/groups/group.service';
import { NotFoundError, ForbiddenError, ValidationError } from '@/utils/errors';
import type { DeepMockProxy } from 'jest-mock-extended';

jest.mock('@/lib/prisma', () => {
  const { mockDeep } = require('jest-mock-extended');
  return {
    __esModule: true,
    default: mockDeep(),
  };
});

const prismaMock = (require('@/lib/prisma').default as unknown) as DeepMockProxy<PrismaClient>;

describe('GroupService.permanentlyDeleteGroup', () => {
  const service = new GroupService();

  beforeEach(() => {
    prismaMock.group.findUnique.mockReset();
    prismaMock.group.update.mockReset();
  });

  it('throws NotFoundError when group does not exist', async () => {
    prismaMock.group.findUnique.mockResolvedValueOnce(null as any);

    await expect(
      service.permanentlyDeleteGroup('g1', 'u1', 'SYS_ADMIN', 'Name')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ForbiddenError when user is not group admin or SYS_ADMIN', async () => {
    prismaMock.group.findUnique.mockResolvedValueOnce({
      id: 'g1',
      groupName: 'Alpha',
      status: 'CLOSED',
      adminUserId: 'u-admin',
    } as any);

    await expect(
      service.permanentlyDeleteGroup('g1', 'u1', 'MEMBER', 'Alpha')
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('throws ValidationError when confirmation text does not match', async () => {
    prismaMock.group.findUnique.mockResolvedValueOnce({
      id: 'g1',
      groupName: 'Alpha',
      status: 'CLOSED',
      adminUserId: 'u1',
    } as any);

    await expect(
      service.permanentlyDeleteGroup('g1', 'u1', 'ADMIN', 'Wrong')
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when group is not CLOSED', async () => {
    prismaMock.group.findUnique.mockResolvedValueOnce({
      id: 'g1',
      groupName: 'Alpha',
      status: 'ACTIVE',
      adminUserId: 'u1',
    } as any);

    await expect(
      service.permanentlyDeleteGroup('g1', 'u1', 'SYS_ADMIN', 'Alpha')
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('updates group to DELETED with deletedAt when CLOSED', async () => {
    prismaMock.group.findUnique.mockResolvedValueOnce({
      id: 'g1',
      groupName: 'Alpha',
      status: 'CLOSED',
      adminUserId: 'u1',
    } as any);

    prismaMock.group.update.mockResolvedValueOnce({
      id: 'g1',
      groupName: 'Alpha',
      status: 'DELETED',
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as any);

    const res = await service.permanentlyDeleteGroup('g1', 'u1', 'SYS_ADMIN', 'Alpha');

    expect(prismaMock.group.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.group.update).toHaveBeenCalledWith({
      where: { id: 'g1' },
      data: { status: 'DELETED', deletedAt: expect.any(Date) },
    });

    expect(res).toEqual({ deleted: true, group: expect.any(Object) });
  });
});
