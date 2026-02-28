import { cookies } from 'next/headers';

export interface ServerAuthSession {
    role: 'ceo' | 'dealer';
    dealer_id: string | null;
}

/**
 * Extracts the mock auth session from request headers.
 * In a real app, this would verify a Supabase session/JWT.
 */
export async function getServerSession(req: Request): Promise<ServerAuthSession> {
    const cookieStore = await cookies();
    const mockAuthCookie = cookieStore.get('intellicar_mock_auth');

    if (mockAuthCookie?.value) {
        try {
            const parsed = JSON.parse(decodeURIComponent(mockAuthCookie.value));
            if (parsed.role === 'dealer') {
                return {
                    role: 'dealer',
                    dealer_id: parsed.dealer_id || null
                };
            }
        } catch (e) {
            console.error("Failed to parse auth cookie", e);
        }
    }

    // Default to CEO
    return {
        role: 'ceo',
        dealer_id: null
    };
}
