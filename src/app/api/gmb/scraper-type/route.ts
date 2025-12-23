import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/gmb/scraper-type
 * Returns the active GMB scraper type (compass, xmiso, or null)
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Check for xmiso scraper first (takes priority)
    const { data: xmisoProvider } = await supabase
      .from('api_providers')
      .select('id, is_active')
      .eq('slug', 'gmb-leads-xmiso')
      .eq('is_active', true)
      .single();

    if (xmisoProvider) {
      return NextResponse.json({ scraperType: 'xmiso', active: true });
    }

    // Check for compass scraper
    const { data: compassProvider } = await supabase
      .from('api_providers')
      .select('id, is_active')
      .eq('slug', 'gmb-leads')
      .eq('is_active', true)
      .single();

    if (compassProvider) {
      return NextResponse.json({ scraperType: 'compass', active: true });
    }

    // No GMB scraper active
    return NextResponse.json({ scraperType: null, active: false });
  } catch (error) {
    console.error('Error checking GMB scraper type:', error);
    return NextResponse.json({ scraperType: null, active: false });
  }
}

