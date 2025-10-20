import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {PERMISSIONS_KEY} from "../decorators/require-permission.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.permissions) {
      throw new ForbiddenException('Permissões não encontradas');
    }

    const hasPermission = requiredPermissions.some((permission) =>
        user.permissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
          `Você não tem permissão para acessar este recurso. Necessário: ${requiredPermissions.join(' ou ')}`,
      );
    }

    return true;
  }
}
