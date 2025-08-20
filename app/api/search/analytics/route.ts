/**
 * Search Analytics API
 * Tracks search behavior and provides analytics data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { z } from 'zod';

// In-memory storage for demo purposes
// In production, use a proper database
const searchAnalytics = {
  queries: new Map<string, { count: number; lastSearched: Date; results: number }>(),
  popularTerms: new Map<string, number>(),
  noResultsQueries: new Set<string>(),
  clickThroughs: new Map<string, { query: string; resultId: string; position: number; timestamp: Date }[]>()
};

// Validation schemas
const trackSearchSchema = z.object({
  query: z.string().min(1),
  resultsCount: z.number().min(0),
  searchTime: z.number().min(0).optional(),
  filters: z.object({
    types: z.array(z.string()).optional(),
    category: z.array(z.string()).optional(),
    status: z.array(z.string()).optional()
  }).optional()
});

const trackClickSchema = z.object({
  query: z.string().min(1),
  resultId: z.string().min(1),
  position: z.number().min(0),
  resultType: z.string().min(1)
});

// POST /api/search/analytics - Track search events
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'search':
        return handleSearchTracking(data);
      case 'click':
        return handleClickTracking(data);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error tracking search analytics:', error);
    return NextResponse.json(
      { error: 'Failed to track analytics' },
      { status: 500 }
    );
  }
}

// GET /api/search/analytics - Get analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const limit = parseInt(searchParams.get('limit') || '10');

    switch (type) {
      case 'overview':
        return getOverviewAnalytics();
      case 'popular-terms':
        return getPopularTerms(limit);
      case 'no-results':
        return getNoResultsQueries(limit);
      case 'click-through':
        return getClickThroughAnalytics();
      default:
        return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error getting search analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}

async function handleSearchTracking(data: any) {
  const validatedData = trackSearchSchema.parse(data);
  const { query, resultsCount, searchTime, filters } = validatedData;

  // Update query statistics
  const existing = searchAnalytics.queries.get(query) || { count: 0, lastSearched: new Date(), results: 0 };
  searchAnalytics.queries.set(query, {
    count: existing.count + 1,
    lastSearched: new Date(),
    results: resultsCount
  });

  // Track popular terms (extract individual words)
  const terms = query.toLowerCase().split(/\\s+/).filter(term => term.length > 2);
  terms.forEach(term => {
    const count = searchAnalytics.popularTerms.get(term) || 0;
    searchAnalytics.popularTerms.set(term, count + 1);
  });

  // Track no-results queries
  if (resultsCount === 0) {
    searchAnalytics.noResultsQueries.add(query);
  }

  return NextResponse.json({ success: true });
}

async function handleClickTracking(data: any) {
  const validatedData = trackClickSchema.parse(data);
  const { query, resultId, position, resultType } = validatedData;

  // Track click-through data
  const userId = 'anonymous'; // In production, use actual user ID
  const existing = searchAnalytics.clickThroughs.get(userId) || [];
  existing.push({
    query,
    resultId,
    position,
    timestamp: new Date()
  });
  searchAnalytics.clickThroughs.set(userId, existing);

  return NextResponse.json({ success: true });
}

async function getOverviewAnalytics() {
  const totalSearches = Array.from(searchAnalytics.queries.values())
    .reduce((sum, data) => sum + data.count, 0);
  
  const uniqueQueries = searchAnalytics.queries.size;
  const noResultsCount = searchAnalytics.noResultsQueries.size;
  const noResultsRate = uniqueQueries > 0 ? (noResultsCount / uniqueQueries) * 100 : 0;

  // Calculate average results per query
  const totalResults = Array.from(searchAnalytics.queries.values())
    .reduce((sum, data) => sum + data.results, 0);
  const avgResultsPerQuery = uniqueQueries > 0 ? totalResults / uniqueQueries : 0;

  // Get recent search trends (last 7 days)
  const recentSearches = Array.from(searchAnalytics.queries.entries())
    .filter(([_, data]) => {
      const daysDiff = (Date.now() - data.lastSearched.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    })
    .length;

  return NextResponse.json({
    overview: {
      totalSearches,
      uniqueQueries,
      noResultsCount,
      noResultsRate: Math.round(noResultsRate * 100) / 100,
      avgResultsPerQuery: Math.round(avgResultsPerQuery * 100) / 100,
      recentSearches
    }
  });
}

async function getPopularTerms(limit: number) {
  const popularTerms = Array.from(searchAnalytics.popularTerms.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));

  return NextResponse.json({ popularTerms });
}

async function getNoResultsQueries(limit: number) {
  const noResultsQueries = Array.from(searchAnalytics.noResultsQueries)
    .slice(0, limit)
    .map(query => ({
      query,
      count: searchAnalytics.queries.get(query)?.count || 1,
      lastSearched: searchAnalytics.queries.get(query)?.lastSearched || new Date()
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ noResultsQueries });
}

async function getClickThroughAnalytics() {
  const allClicks = Array.from(searchAnalytics.clickThroughs.values()).flat();
  
  // Calculate click-through rate by position
  const positionStats = new Map<number, { clicks: number, searches: number }>();
  
  allClicks.forEach(click => {
    const existing = positionStats.get(click.position) || { clicks: 0, searches: 0 };
    positionStats.set(click.position, {
      clicks: existing.clicks + 1,
      searches: existing.searches + 1 // Simplified - in reality, track searches separately
    });
  });

  const clickThroughRates = Array.from(positionStats.entries())
    .map(([position, stats]) => ({
      position,
      clicks: stats.clicks,
      rate: stats.searches > 0 ? (stats.clicks / stats.searches) * 100 : 0
    }))
    .sort((a, b) => a.position - b.position);

  // Most clicked queries
  const queryClicks = new Map<string, number>();
  allClicks.forEach(click => {
    const count = queryClicks.get(click.query) || 0;
    queryClicks.set(click.query, count + 1);
  });

  const topClickedQueries = Array.from(queryClicks.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([query, clicks]) => ({ query, clicks }));

  return NextResponse.json({
    clickThroughRates,
    topClickedQueries,
    totalClicks: allClicks.length
  });
}