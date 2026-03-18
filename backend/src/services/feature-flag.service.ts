export class FeatureFlagService {
  private flags = new Map<string, boolean>();

  constructor() {
    // Initialize flags from environment variables
    this.flags.set('micro_savings_enabled', process.env.ENABLE_MICRO_SAVINGS === 'true');
    this.flags.set('micro_investments_enabled', process.env.ENABLE_MICRO_INVESTMENTS === 'true');
    this.flags.set('robo_advisor_enabled', process.env.ENABLE_ROBO_ADVISOR === 'true');
    this.flags.set('auto_invest_enabled', process.env.ENABLE_AUTO_INVEST === 'true');
  }

  /**
   * Check if a feature is enabled globally or for a specific user
   */
  isEnabled(flagName: string, userId?: string): boolean {
    const globalFlag = this.flags.get(flagName) || false;
    
    // In the future, we can add user-specific overrides from the database
    // to support beta testing programs.
    
    return globalFlag;
  }
}

export const featureFlagService = new FeatureFlagService();
