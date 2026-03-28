import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';

export class AnalyticsController {
  static async getTrending(req: Request, res: Response) {
    try {
      const period = (req.query.period as '7days' | '30days') || '7days';

      // Validate period
      if (!['7days', '30days'].includes(period)) {
        return res
          .status(400)
          .json({ error: 'Invalid period. Use 7days or 30days' });
      }

      const analytics = await AnalyticsService.getTrendingAnalytics(period);

      // Set cache headers (15 minutes)
      res.set({
        'Cache-Control': 'public, max-age=900', // 15 minutes
        Expires: new Date(Date.now() + 15 * 60 * 1000).toUTCString(),
      });

      res.json(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }
}
