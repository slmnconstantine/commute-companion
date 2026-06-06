import { supabase } from '@/lib/supabase';
import { HubPost, HubPostWithAuthor } from '@/types/database';

/** Create a hub post */
export async function createHubPost(postData: Omit<HubPost, 'id' | 'created_at'>): Promise<{ data: HubPost | null, error: Error | null }> {
  const { data, error } = await supabase
    .from('hub_posts')
    .insert(postData)
    .select()
    .single();
  return { data: data as HubPost | null, error: error as Error | null };
}

/** Get hub post feed */
export async function getHubPosts(limit: number = 20, offset: number = 0): Promise<HubPostWithAuthor[]> {
  const { data, error } = await supabase
    .from('hub_posts')
    .select(`*, author:profiles!hub_posts_author_id_fkey(*)`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data || []) as HubPostWithAuthor[];
}

/** Get posts by route hash */
export async function getPostsByRoute(routeHash: string): Promise<HubPostWithAuthor[]> {
  const { data, error } = await supabase
    .from('hub_posts')
    .select(`*, author:profiles!hub_posts_author_id_fkey(*)`)
    .eq('route_hash', routeHash)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as HubPostWithAuthor[];
}
