import OpenAI from 'openai';
import { config } from '../config/index.js';
import { logger } from '../index.js';

let openai: OpenAI | null = null;

if (config.openai.apiKey) {
  openai = new OpenAI({ apiKey: config.openai.apiKey });
}

export interface CaptionSuggestion {
  caption: string;
  hashtags: string[];
  categories: string[];
}

export const generateCaption = async (
  imageDescription: string,
  userStyle: string = 'casual'
): Promise<CaptionSuggestion> => {
  if (!openai) {
    return {
      caption: imageDescription,
      hashtags: [],
      categories: [],
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a social media caption expert. Generate engaging captions in a ${userStyle} style. 
          Always include relevant hashtags (5-10) and content categories.
          Format response as JSON with: caption, hashtags (array), categories (array).`,
        },
        {
          role: 'user',
          content: `Generate a caption for: ${imageDescription}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      caption: result.caption || imageDescription,
      hashtags: result.hashtags || [],
      categories: result.categories || [],
    };
  } catch (error) {
    logger.error('AI caption generation failed:', error);
    return {
      caption: imageDescription,
      hashtags: [],
      categories: [],
    };
  }
};

export const suggestHashtags = async (content: string): Promise<string[]> => {
  if (!openai) return [];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate 10 relevant and trending hashtags for social media content. Return as a JSON array of strings.',
        },
        {
          role: 'user',
          content: `Suggest hashtags for: ${content}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.hashtags || [];
  } catch {
    return [];
  }
};

export const moderateContent = async (
  text: string
): Promise<{ isSafe: boolean; categories: string[]; score: number }> => {
  if (!openai) {
    return { isSafe: true, categories: [], score: 0 };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze content for safety. Check for: spam, harassment, hate speech, violence, nudity, misinformation.
          Return JSON: { isSafe: boolean, categories: string[], score: number (0-1, 1 being safest) }`,
        },
        {
          role: 'user',
          content: `Moderate this content: ${text}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      isSafe: result.isSafe ?? true,
      categories: result.categories || [],
      score: result.score ?? 1,
    };
  } catch {
    return { isSafe: true, categories: [], score: 0 };
  }
};

export const generateAccessibilityCaption = async (
  imageDescription: string
): Promise<string> => {
  if (!openai) return imageDescription;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate a concise, descriptive alt text for accessibility purposes. Focus on what is visually present.',
        },
        {
          role: 'user',
          content: `Generate alt text for: ${imageDescription}`,
        },
      ],
      max_tokens: 100,
    });

    return response.choices[0].message.content || imageDescription;
  } catch {
    return imageDescription;
  }
};

export const categorizeContent = async (content: string): Promise<string[]> => {
  if (!openai) return [];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Categorize social media content into 3-5 relevant categories. Return as JSON array.',
        },
        {
          role: 'user',
          content: `Categorize: ${content}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.categories || [];
  } catch {
    return [];
  }
};
