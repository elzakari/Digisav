import { Request, Response, NextFunction } from 'express';
import { featureFlagService } from '../../services/feature-flag.service';
import { ForbiddenError } from '../../utils/errors';

/**
 * Middleware to check if a feature flag is enabled
 */
export const checkFeatureFlag = (flagName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    
    if (!featureFlagService.isEnabled(flagName, userId)) {
      throw new ForbiddenError(`Feature '${flagName}' is currently disabled`);
    }
    
    next();
  };
};
