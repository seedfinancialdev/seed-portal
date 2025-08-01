/**
 * AI Service (OpenAI Implementation)
 * 
 * This is the "doorway" file for our AI integration.
 * If we ever switch from OpenAI to another provider, we only need to rewrite this file.
 */

import OpenAI from 'openai';
import { cache } from '../cache';
import { logger } from '../logger';
import type { ServiceHealthResult } from './index';

export interface AIAnalysisResult {
  insights: string[];
  riskScore: number;
  recommendations: string[];
  confidence: number;
}

export interface AIGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export class AIService {
  private client: OpenAI;
  private readonly CACHE_TTL = {
    ANALYSIS: 60 * 60,    // 1 hour
    GENERATION: 30 * 60,  // 30 minutes
  };

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.error('OPENAI_API_KEY not found in environment variables');
      throw new Error('AI service configuration missing');
    }
    
    this.client = new OpenAI({ apiKey });
  }

  async healthCheck(): Promise<ServiceHealthResult> {
    const startTime = Date.now();
    try {
      // Simple health check - list models
      await this.client.models.list();
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime
      };
    } catch (error: any) {
      logger.error('AI health check failed', { error: error.message });
      
      if (error.status === 429) {
        return { status: 'degraded', message: 'Rate limited' };
      }
      
      return { 
        status: 'unhealthy', 
        message: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  async analyzeClient(clientData: {
    companyName?: string;
    industry?: string;
    revenue?: string;
    employees?: number;
    description?: string;
  }): Promise<AIAnalysisResult> {
    const cacheKey = `ai:analysis:${this.hashData(clientData)}`;
    
    try {
      // Check cache first
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.debug('AI analysis cache hit', { companyName: clientData.companyName });
        return JSON.parse(cached);
      }

      logger.debug('AI client analysis', { companyName: clientData.companyName });

      const prompt = `Analyze this business for financial services opportunities:
Company: ${clientData.companyName || 'Unknown'}
Industry: ${clientData.industry || 'Not specified'}
Revenue: ${clientData.revenue || 'Not specified'}
Employees: ${clientData.employees || 'Not specified'}
Description: ${clientData.description || 'Not provided'}

Provide:
1. Key business insights and pain points
2. Risk assessment (0-100 scale)
3. Service recommendations
4. Confidence level (0-100)

Format as JSON with fields: insights (array), riskScore (number), recommendations (array), confidence (number)`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI service');
      }

      let result: AIAnalysisResult;
      try {
        result = JSON.parse(content);
      } catch {
        // Fallback if AI doesn't return valid JSON
        result = {
          insights: [content.slice(0, 200) + '...'],
          riskScore: 50,
          recommendations: ['Review manually due to parsing error'],
          confidence: 30
        };
      }

      // Cache the result
      await cache.set(cacheKey, JSON.stringify(result), this.CACHE_TTL.ANALYSIS);
      return result;
    } catch (error: any) {
      logger.error('AI client analysis failed', { companyName: clientData.companyName, error: error.message });
      
      if (error.status === 429) {
        logger.warn('AI rate limit hit during analysis', { companyName: clientData.companyName });
      }
      
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  async generateContent(prompt: string, options: AIGenerationOptions = {}): Promise<string> {
    const cacheKey = `ai:generation:${this.hashString(prompt)}`;
    
    try {
      // Check cache first
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.debug('AI generation cache hit');
        return cached;
      }

      logger.debug('AI content generation', { promptLength: prompt.length });

      const response = await this.client.chat.completions.create({
        model: options.model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI service');
      }

      // Cache the result
      await cache.set(cacheKey, content, this.CACHE_TTL.GENERATION);
      return content;
    } catch (error: any) {
      logger.error('AI content generation failed', { error: error.message });
      
      if (error.status === 429) {
        logger.warn('AI rate limit hit during generation');
      }
      
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  private hashData(data: any): string {
    const str = JSON.stringify(data, Object.keys(data).sort());
    return this.hashString(str);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  // Clear cache on data mutations
  async invalidateCache(pattern?: string): Promise<void> {
    try {
      const searchPattern = pattern ? `ai:${pattern}:*` : 'ai:*';
      const keys = await cache.keys(searchPattern);
      if (keys.length > 0) {
        await cache.del(...keys);
        logger.debug('AI cache invalidated', { pattern, clearedKeys: keys.length });
      }
    } catch (error: any) {
      logger.warn('AI cache invalidation failed', { error: error.message });
    }
  }
}