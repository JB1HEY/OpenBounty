import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');

        if (!query || query.trim().length < 2) {
            return NextResponse.json({ profiles: [] });
        }

        // Search for profiles by name or wallet address
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('wallet_address, name, avatar_url, bio, location')
            .or(`name.ilike.%${query}%,wallet_address.ilike.%${query}%`)
            .limit(10);

        if (error) {
            console.error('Error searching profiles:', error);
            return NextResponse.json({ error: 'Failed to search profiles' }, { status: 500 });
        }

        return NextResponse.json({ profiles: profiles || [] });
    } catch (error) {
        console.error('Error in search API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
