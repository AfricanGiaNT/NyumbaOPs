import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const contextFor = (role?: string) => ({
    getHandler: () => function route() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  }) as unknown as ExecutionContext;

  it('denies staff access to owner-only financial routes', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(['OWNER']) };
    expect(new RolesGuard(reflector as unknown as Reflector).canActivate(contextFor('STAFF'))).toBe(false);
  });

  it('allows an owner and denies an anonymous caller on an owner-only route', () => {
    const reflector = { getAllAndOverride: jest.fn().mockImplementation((key: string) => key === 'roles' ? ['OWNER'] : false) };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(contextFor('OWNER'))).toBe(true);
    expect(guard.canActivate(contextFor())).toBe(false);
  });
});
