import { GoogleGenerativeAI } from '@google/generative-ai';

// Models
const EMBEDDING_MODEL = 'text-embedding-004';
const GENERATION_MODEL = 'gemini-1.5-flash';

// Lazy initialization to avoid build-time errors when API key is not available
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Generate embeddings for text using Google's text-embedding-004 model
 * Dimension: 768
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = getGenAI().getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const model = getGenAI().getGenerativeModel({ model: EMBEDDING_MODEL });
    const results = await Promise.all(
      texts.map(text => model.embedContent(text))
    );
    return results.map(r => r.embedding.values);
  } catch (error) {
    console.error('Batch embedding generation failed:', error);
    throw error;
  }
}

export interface BusinessContext {
  name: string;
  description: string;
  targetAudience: string;
  keywords: string[];
  industry: string;
  websiteUrl?: string;
  toneOfVoice: string;
}

export interface ContentItem {
  title: string;
  content: string;
  url: string;
  platform: string;
  subreddit?: string;
  author?: string;
}

/**
 * Generate a marketing comment for a piece of content
 */
export async function generateComment(
  business: BusinessContext,
  content: ContentItem,
  options?: {
    maxLength?: number;
    includeLink?: boolean;
    style?: 'helpful' | 'engaging' | 'authoritative' | 'casual';
  }
): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: GENERATION_MODEL });
  
  const maxLength = options?.maxLength || 300;
  const style = options?.style || 'helpful';
  
  const prompt = `You are a social media marketing expert. Generate a ${style} comment for a Reddit post that subtly promotes a business while providing genuine value to the discussion.

Business Context:
- Name: ${business.name}
- Industry: ${business.industry}
- Description: ${business.description}
- Target Audience: ${business.targetAudience}
- Website: ${business.websiteUrl || 'N/A'}
- Tone: ${business.toneOfVoice}
- Keywords: ${business.keywords.join(', ')}

Post to Comment On:
- Platform: ${content.platform}${content.subreddit ? ` (r/${content.subreddit})` : ''}
- Title: ${content.title}
- Content: ${content.content.slice(0, 1000)}${content.content.length > 1000 ? '...' : ''}
- Author: ${content.author || 'Unknown'}

Requirements:
1. Be genuinely helpful and add value to the conversation
2. Reference something specific from the original post to show engagement
3. Naturally weave in relevant expertise from the business's domain
4. Keep it under ${maxLength} characters
5. Sound authentic and conversational, NOT promotional or spammy
6. DO NOT use generic phrases like "Great post!" or "Thanks for sharing!"
7. DO NOT directly mention the business name unless contextually appropriate
8. ${options?.includeLink ? 'Include a subtle reference or link only if truly relevant' : 'Do NOT include any links'}
9. Match the ${business.toneOfVoice} tone

Generate ONLY the comment text, nothing else:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Ensure it doesn't exceed max length
    if (text.length > maxLength) {
      return text.slice(0, maxLength - 3) + '...';
    }
    
    return text;
  } catch (error) {
    console.error('Comment generation failed:', error);
    throw error;
  }
}

/**
 * Generate multiple comments in batch
 */
export async function generateComments(
  business: BusinessContext,
  contents: ContentItem[],
  options?: {
    maxLength?: number;
    includeLink?: boolean;
    style?: 'helpful' | 'engaging' | 'authoritative' | 'casual';
  }
): Promise<{ content: ContentItem; comment: string; error?: string }[]> {
  const results = await Promise.allSettled(
    contents.map(content => generateComment(business, content, options))
  );
  
  return results.map((result, index) => ({
    content: contents[index],
    comment: result.status === 'fulfilled' ? result.value : '',
    error: result.status === 'rejected' ? String(result.reason) : undefined,
  }));
}

/**
 * Calculate relevance score between business and content using embeddings
 */
export async function calculateRelevanceScore(
  businessEmbedding: number[],
  contentEmbedding: number[]
): Promise<number> {
  // Cosine similarity
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < businessEmbedding.length; i++) {
    dotProduct += businessEmbedding[i] * contentEmbedding[i];
    normA += businessEmbedding[i] * businessEmbedding[i];
    normB += contentEmbedding[i] * contentEmbedding[i];
  }
  
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  
  // Convert to 0-1 score (cosine similarity can be -1 to 1)
  return (similarity + 1) / 2;
}

/**
 * Generate business description embedding for relevance matching
 */
export async function generateBusinessEmbedding(business: BusinessContext): Promise<number[]> {
  const text = `
    ${business.name}
    ${business.description}
    Target audience: ${business.targetAudience}
    Industry: ${business.industry}
    Keywords: ${business.keywords.join(', ')}
  `.trim();
  
  return generateEmbedding(text);
}

/**
 * Rank content items by relevance to business
 */
export async function rankContentByRelevance(
  business: BusinessContext,
  contents: ContentItem[]
): Promise<{ content: ContentItem; score: number }[]> {
  // Generate business embedding
  const businessEmbedding = await generateBusinessEmbedding(business);
  
  // Generate content embeddings
  const contentTexts = contents.map(c => `${c.title}\n${c.content.slice(0, 500)}`);
  const contentEmbeddings = await generateEmbeddings(contentTexts);
  
  // Calculate scores
  const scored = await Promise.all(
    contents.map(async (content, i) => ({
      content,
      score: await calculateRelevanceScore(businessEmbedding, contentEmbeddings[i]),
    }))
  );
  
  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Generate AI-suggested hashtags for a business
 */
export async function generateHashtags(
  business: BusinessContext,
  platform: 'reddit' | 'instagram' | 'tiktok' | 'twitter' | 'linkedin',
  count: number = 10
): Promise<string[]> {
  const model = getGenAI().getGenerativeModel({ model: GENERATION_MODEL });
  
  const prompt = `Generate ${count} highly relevant ${platform} hashtags for this business:

Business: ${business.name}
Industry: ${business.industry}
Description: ${business.description}
Target Audience: ${business.targetAudience}
Keywords: ${business.keywords.join(', ')}

Requirements:
- Mix of popular and niche hashtags
- Relevant to the industry and target audience
- Appropriate for ${platform}
- No # symbol in the output

Return ONLY a JSON array of hashtag strings, nothing else:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Parse JSON array
    const hashtags = JSON.parse(text);
    return Array.isArray(hashtags) ? hashtags : [];
  } catch (error) {
    console.error('Hashtag generation failed:', error);
    return [];
  }
}

/**
 * Generate AI-suggested subreddits for a business
 */
export async function generateSubreddits(
  business: BusinessContext,
  count: number = 20
): Promise<string[]> {
  const model = getGenAI().getGenerativeModel({ model: GENERATION_MODEL });
  
  const prompt = `Suggest ${count} relevant Reddit subreddits where this business could engage with potential customers:

Business: ${business.name}
Industry: ${business.industry}
Description: ${business.description}
Target Audience: ${business.targetAudience}
Keywords: ${business.keywords.join(', ')}

Requirements:
- Mix of large active subreddits and smaller niche communities
- Subreddits where the target audience is likely to be
- Avoid subreddits that ban self-promotion
- No r/ prefix in the output

Return ONLY a JSON array of subreddit names, nothing else:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    const subreddits = JSON.parse(text);
    return Array.isArray(subreddits) ? subreddits : [];
  } catch (error) {
    console.error('Subreddit generation failed:', error);
    return [];
  }
}




