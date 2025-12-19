/**
 * Lead Lists Service
 * 
 * Manages lead lists and verified leads in the database.
 * Handles find-or-create patterns and batch insertions.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { ExtractedLead } from './lead-extraction';

export interface LeadList {
  id: string;
  lead_type: 'business' | 'person';
  industry: string;
  city: string;
  state: string;
  country_code: string;
  lead_count: number;
  created_at: string;
  updated_at: string;
}

export interface VerifiedLead {
  id: string;
  lead_list_id: string;
  email: string;
  domain: string;
  company_name: string | null;
  lead_type: 'business' | 'person';
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string;
  state: string;
  country_code: string;
  industry: string;
  verification_state: string;
  verification_data: Record<string, unknown> | null;
  source_scrape_id: string | null;
  created_at: string;
}

export interface EmailVerificationResult {
  email: string;
  domain: string;
  state: string; // "Deliverable", "Undeliverable", etc.
  data: {
    Email: string;
    Domain: string;
    IsValid: boolean;
    Free: boolean;
    Role: boolean;
    Disposable: boolean;
    AcceptAll: boolean;
    [key: string]: unknown;
  };
}

export interface InsertLeadsResult {
  inserted: number;
  duplicates: number;
  errors: string[];
}

/**
 * Find or create a lead list by type + industry + location
 */
export async function findOrCreateLeadList(
  supabase: SupabaseClient,
  params: {
    leadType: 'business' | 'person';
    industry: string;
    city: string;
    state: string;
    countryCode: string;
  }
): Promise<LeadList | null> {
  const { leadType, industry, city, state, countryCode } = params;

  // Try to find existing list first
  const { data: existing } = await supabase
    .from('lead_lists')
    .select('*')
    .eq('lead_type', leadType)
    .eq('industry', industry)
    .eq('city', city)
    .eq('state', state)
    .eq('country_code', countryCode)
    .single();

  if (existing) {
    return existing as LeadList;
  }

  // Create new list
  const { data: created, error } = await supabase
    .from('lead_lists')
    .insert({
      lead_type: leadType,
      industry,
      city,
      state,
      country_code: countryCode,
      lead_count: 0,
    })
    .select()
    .single();

  if (error) {
    // Handle race condition - another process may have created it
    if (error.code === '23505') { // Unique violation
      const { data: retryExisting } = await supabase
        .from('lead_lists')
        .select('*')
        .eq('lead_type', leadType)
        .eq('industry', industry)
        .eq('city', city)
        .eq('state', state)
        .eq('country_code', countryCode)
        .single();
      
      return retryExisting as LeadList | null;
    }
    console.error('Error creating lead list:', error);
    return null;
  }

  return created as LeadList;
}

/**
 * Insert verified leads into the database
 * Uses ON CONFLICT to skip duplicates
 */
export async function insertVerifiedLeads(
  supabase: SupabaseClient,
  leadListId: string,
  leads: ExtractedLead[],
  verificationResults: EmailVerificationResult[],
  sourceScrapeId: string | null
): Promise<InsertLeadsResult> {
  const result: InsertLeadsResult = {
    inserted: 0,
    duplicates: 0,
    errors: [],
  };

  if (leads.length === 0) {
    return result;
  }

  // Create a map of verification results by email
  const verificationMap = new Map<string, EmailVerificationResult>();
  for (const vr of verificationResults) {
    verificationMap.set(vr.email.toLowerCase(), vr);
  }

  // Prepare records for insertion
  const records = leads.map(lead => {
    const verification = verificationMap.get(lead.email.toLowerCase());
    
    return {
      lead_list_id: leadListId,
      email: lead.email,
      domain: lead.domain,
      company_name: lead.companyName,
      lead_type: lead.leadType,
      phone: lead.phone,
      website: lead.website,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      country_code: lead.countryCode,
      industry: lead.industry,
      verification_state: verification?.state || 'pending',
      verification_data: verification?.data || null,
      source_scrape_id: sourceScrapeId,
    };
  });

  // Insert in batches to avoid payload limits
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    // Use upsert with ignoreDuplicates to skip existing emails
    const { data, error } = await supabase
      .from('verified_leads')
      .upsert(batch, {
        onConflict: 'email,country_code',
        ignoreDuplicates: true,
      })
      .select('id');

    if (error) {
      result.errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
    } else {
      const insertedCount = data?.length || 0;
      result.inserted += insertedCount;
      result.duplicates += batch.length - insertedCount;
    }
  }

  return result;
}

/**
 * Filter verified leads to only include deliverable emails
 */
export function filterDeliverableLeads(
  leads: ExtractedLead[],
  verificationResults: EmailVerificationResult[]
): ExtractedLead[] {
  const deliverableEmails = new Set<string>();
  
  for (const vr of verificationResults) {
    if (vr.state === 'Deliverable' && vr.data?.IsValid) {
      deliverableEmails.add(vr.email.toLowerCase());
    }
  }

  return leads.filter(lead => 
    deliverableEmails.has(lead.email.toLowerCase())
  );
}

/**
 * Process extracted leads: filter deliverable, group by location, save to DB
 */
export async function processAndSaveVerifiedLeads(
  supabase: SupabaseClient,
  leads: ExtractedLead[],
  verificationResults: EmailVerificationResult[],
  sourceScrapeId: string | null
): Promise<{
  totalProcessed: number;
  totalInserted: number;
  totalDuplicates: number;
  leadListsCreated: number;
  errors: string[];
}> {
  const result = {
    totalProcessed: 0,
    totalInserted: 0,
    totalDuplicates: 0,
    leadListsCreated: 0,
    errors: [] as string[],
  };

  // Filter to only deliverable emails
  const deliverableLeads = filterDeliverableLeads(leads, verificationResults);
  result.totalProcessed = deliverableLeads.length;

  if (deliverableLeads.length === 0) {
    return result;
  }

  // Group leads by location
  const groupedLeads = new Map<string, ExtractedLead[]>();
  for (const lead of deliverableLeads) {
    const key = `${lead.leadType}|${lead.industry}|${lead.city}|${lead.state}|${lead.countryCode}`;
    if (!groupedLeads.has(key)) {
      groupedLeads.set(key, []);
    }
    groupedLeads.get(key)!.push(lead);
  }

  // Process each group
  for (const [key, groupLeads] of groupedLeads) {
    const [leadType, industry, city, state, countryCode] = key.split('|');
    
    // Find or create lead list
    const leadList = await findOrCreateLeadList(supabase, {
      leadType: leadType as 'business' | 'person',
      industry,
      city,
      state,
      countryCode,
    });

    if (!leadList) {
      result.errors.push(`Failed to create lead list for ${key}`);
      continue;
    }

    // Check if this is a new list (lead_count === 0 means we just created it)
    if (leadList.lead_count === 0) {
      result.leadListsCreated++;
    }

    // Insert leads
    const insertResult = await insertVerifiedLeads(
      supabase,
      leadList.id,
      groupLeads,
      verificationResults,
      sourceScrapeId
    );

    result.totalInserted += insertResult.inserted;
    result.totalDuplicates += insertResult.duplicates;
    result.errors.push(...insertResult.errors);
  }

  return result;
}

/**
 * Get lead list statistics
 */
export async function getLeadListStats(
  supabase: SupabaseClient,
  filters?: {
    leadType?: 'business' | 'person';
    industry?: string;
    countryCode?: string;
  }
): Promise<{
  totalLists: number;
  totalLeads: number;
  byCountry: Record<string, number>;
  byIndustry: Record<string, number>;
}> {
  let query = supabase
    .from('lead_lists')
    .select('*');

  if (filters?.leadType) {
    query = query.eq('lead_type', filters.leadType);
  }
  if (filters?.industry) {
    query = query.eq('industry', filters.industry);
  }
  if (filters?.countryCode) {
    query = query.eq('country_code', filters.countryCode);
  }

  const { data: lists, error } = await query;

  if (error || !lists) {
    return {
      totalLists: 0,
      totalLeads: 0,
      byCountry: {},
      byIndustry: {},
    };
  }

  const byCountry: Record<string, number> = {};
  const byIndustry: Record<string, number> = {};
  let totalLeads = 0;

  for (const list of lists) {
    totalLeads += list.lead_count || 0;
    
    byCountry[list.country_code] = (byCountry[list.country_code] || 0) + (list.lead_count || 0);
    byIndustry[list.industry] = (byIndustry[list.industry] || 0) + (list.lead_count || 0);
  }

  return {
    totalLists: lists.length,
    totalLeads,
    byCountry,
    byIndustry,
  };
}


