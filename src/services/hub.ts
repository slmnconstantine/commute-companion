import { supabase } from '@/lib/supabase';
import { HubPostWithAuthor, PostCommentWithAuthor } from '@/types/database';
import { sendPushNotification } from './pushNotifications';
import { createNotification } from './notifications';
import { handleServiceError } from '@/utils/errorHelper';

import { isJsonLabel, getNearbyRouteHashes } from '@/utils/routeHash';

export interface GetPostsOptions {
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const getPosts = async (
  routeHash: string | string[],
  currentUserId: string,
  options?: GetPostsOptions
): Promise<HubPostWithAuthor[]> => {
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  // Build query
  let query = supabase
    .from('hub_posts')
    .select(`
      *,
      author:profiles!hub_posts_author_id_fkey(*),
      trip:trips(*),
      post_likes(count),
      post_comments(count)
    `);

  if (Array.isArray(routeHash)) {
    query = query.in('route_hash', routeHash);
  } else {
    const candidateHashes = getNearbyRouteHashes(routeHash);
    query = query.in('route_hash', candidateHashes);
  }

  // Tag filter
  if (options?.tag && options.tag.toLowerCase() !== 'all') {
    query = query.eq('status_tag', options.tag.toLowerCase());
  }

  // Search filter
  if (options?.search && options.search.trim().length > 0) {
    query = query.ilike('message', `%${options.search.trim()}%`);
  }

  // Ordering: newest first
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: posts, error } = await query;

  if (error) {
    handleServiceError('Error fetching posts:', error);
    return [];
  }

  if (!posts || posts.length === 0) {
    return [];
  }

  const postIds = posts.map((p) => p.id);

  // Fetch reactions and user's reaction for these posts
  let userReactionsMap: Record<string, string> = {};
  let postReactionsMap: Record<string, Record<string, number>> = {};

  if (postIds.length > 0) {
    const { data: likes } = await supabase
      .from('post_likes')
      .select('post_id, user_id, reaction_type')
      .in('post_id', postIds);

    if (likes) {
      likes.forEach((like) => {
        const type = like.reaction_type || 'like';
        if (!postReactionsMap[like.post_id]) {
          postReactionsMap[like.post_id] = {};
        }
        postReactionsMap[like.post_id][type] = (postReactionsMap[like.post_id][type] || 0) + 1;

        if (currentUserId && like.user_id === currentUserId) {
          userReactionsMap[like.post_id] = type;
        }
      });
    }
  }

  // Fetch up to 2 recent comments per post for inline preview
  let recentCommentsMap: Record<string, PostCommentWithAuthor[]> = {};
  if (postIds.length > 0) {
    const { data: commentsData } = await supabase
      .from('post_comments')
      .select(`
        *,
        author:profiles!post_comments_author_id_fkey(*)
      `)
      .in('post_id', postIds)
      .order('created_at', { ascending: false });

    if (commentsData) {
      commentsData.forEach((c) => {
        if (!recentCommentsMap[c.post_id]) {
          recentCommentsMap[c.post_id] = [];
        }
        if (recentCommentsMap[c.post_id].length < 2) {
          recentCommentsMap[c.post_id].push({
            ...c,
            author: Array.isArray(c.author) ? c.author[0] : c.author,
          });
        }
      });
    }
  }

  // Map the response to HubPostWithAuthor
  return posts.map((post) => ({
    ...post,
    author: Array.isArray(post.author) ? post.author[0] : post.author,
    trip: Array.isArray(post.trip) ? post.trip[0] : post.trip,
    likes_count: post.post_likes?.[0]?.count || 0,
    comments_count: post.post_comments?.[0]?.count || 0,
    user_has_liked: !!userReactionsMap[post.id],
    user_reaction: userReactionsMap[post.id] || null,
    reactions_count: postReactionsMap[post.id] || {},
    recent_comments: recentCommentsMap[post.id] || [],
  }));
};

/** Toggle reaction or like */
export const toggleReaction = async (
  postId: string,
  userId: string,
  reactionType: string = 'like'
): Promise<{ success: boolean; activeReaction: string | null }> => {
  try {
    // Check existing reaction
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id, reaction_type')
      .match({ post_id: postId, user_id: userId })
      .maybeSingle();

    if (existing) {
      if (existing.reaction_type === reactionType) {
        // Same reaction -> remove it
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .match({ post_id: postId, user_id: userId });
        if (error) throw error;
        return { success: true, activeReaction: null };
      } else {
        // Different reaction -> update it
        const { error } = await supabase
          .from('post_likes')
          .update({ reaction_type: reactionType })
          .match({ post_id: postId, user_id: userId });
        if (error) throw error;
        return { success: true, activeReaction: reactionType };
      }
    } else {
      // New reaction -> insert it
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: userId, reaction_type: reactionType });
      if (error) throw error;

      // Send push notification to post author
      const { data: postData } = await supabase.from('hub_posts').select('author_id').eq('id', postId).single();
      if (postData && postData.author_id !== userId) {
        const { data: authorData } = await supabase.from('profiles').select('id, push_token').eq('id', postData.author_id).single();
        const { data: likerData } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
        if (authorData?.id && likerData?.full_name) {
          sendPushNotification(authorData.push_token, 'New Reaction', `${likerData.full_name} reacted to your post!`, { type: 'hub_post', postId }, authorData.id);
        }
      }
      return { success: true, activeReaction: reactionType };
    }
  } catch (err) {
    handleServiceError('Error toggling reaction:', err);
    return { success: false, activeReaction: null };
  }
};

/** Backward compatible toggleLike */
export const toggleLike = async (postId: string, userId: string, currentlyLiked: boolean): Promise<boolean> => {
  const result = await toggleReaction(postId, userId, 'like');
  return result.success;
};

/** Toggle Pin / Unpin Post (enforces max 1 pinned post per user on route) */
export const togglePinPost = async (
  postId: string,
  userId: string,
  routeHash: string,
  currentlyPinned: boolean
): Promise<boolean> => {
  try {
    if (!currentlyPinned) {
      // Unpin any existing pinned post from this author on this route
      await supabase
        .from('hub_posts')
        .update({ is_pinned: false })
        .match({ author_id: userId, route_hash: routeHash });

      // Pin the new post
      const { error } = await supabase
        .from('hub_posts')
        .update({ is_pinned: true })
        .match({ id: postId, author_id: userId });
      if (error) throw error;
    } else {
      // Unpin the post
      const { error } = await supabase
        .from('hub_posts')
        .update({ is_pinned: false })
        .match({ id: postId, author_id: userId });
      if (error) throw error;
    }
    return true;
  } catch (err) {
    handleServiceError('Error toggling pin status:', err);
    return false;
  }
};

export const getComments = async (postId: string): Promise<PostCommentWithAuthor[]> => {
  const { data, error } = await supabase
    .from('post_comments')
    .select(`
      *,
      author:profiles!post_comments_author_id_fkey(*)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    handleServiceError('Error fetching comments:', error);
    return [];
  }

  return data.map(comment => ({
    ...comment,
    author: Array.isArray(comment.author) ? comment.author[0] : comment.author
  }));
};

export const createComment = async (postId: string, userId: string, content: string) => {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      author_id: userId,
      content
    })
    .select(`
      *,
      author:profiles!post_comments_author_id_fkey(*)
    `)
    .single();

  if (error) throw error;
  
  // Send push notification to the post author
  const { data: postData } = await supabase.from('hub_posts').select('author_id').eq('id', postId).single();
  if (postData && postData.author_id !== userId) {
    const { data: authorData } = await supabase.from('profiles').select('id, push_token').eq('id', postData.author_id).single();
    const commenterName = Array.isArray(data.author) ? data.author[0].full_name : data.author.full_name;
    if (authorData?.id && commenterName) {
      sendPushNotification(authorData.push_token, 'New Comment', `${commenterName} commented: "${content}"`, { type: 'hub_post', postId }, authorData.id);
    }
  }
  
  return {
    ...data,
    author: Array.isArray(data.author) ? data.author[0] : data.author
  } as PostCommentWithAuthor;
};

export const createPost = async (
  userId: string, 
  routeHash: string, 
  statusTag: string, 
  message: string, 
  locationLat: number, 
  locationLng: number,
  locationLabel?: string,
  imageUrls?: string[],
  tripId?: string
) => {
  let { data, error } = await supabase
    .from('hub_posts')
    .insert({
      author_id: userId,
      route_hash: routeHash,
      status_tag: statusTag,
      message,
      location_lat: locationLat,
      location_lng: locationLng,
      location_label: locationLabel,
      image_urls: imageUrls && imageUrls.length > 0 ? imageUrls : null,
      is_pinned: false,
      trip_id: tripId || null,
    })
    .select(`
      *,
      author:profiles!hub_posts_author_id_fkey(*),
      trip:trips(*)
    `)
    .single();

  // If the database has a check constraint excluding 'ride', gracefully fallback to 'other'
  if (error && error.message?.includes('hub_posts_status_tag_check') && statusTag === 'ride') {
    const retryRes = await supabase
      .from('hub_posts')
      .insert({
        author_id: userId,
        route_hash: routeHash,
        status_tag: 'other',
        message,
        location_lat: locationLat,
        location_lng: locationLng,
        location_label: locationLabel,
        image_urls: imageUrls && imageUrls.length > 0 ? imageUrls : null,
        is_pinned: false,
        trip_id: tripId || null,
      })
      .select(`
        *,
        author:profiles!hub_posts_author_id_fkey(*),
        trip:trips(*)
      `)
      .single();
    data = retryRes.data;
    error = retryRes.error;
  }

  if (error) throw error;
  
  const authorProfile = Array.isArray(data.author) ? data.author[0] : data.author;
  
  // 1. Notify mentioned users in the post
  const mentions = message.match(/@([\w.-]+)/g);
  const notifiedUserIds = new Set<string>();

  if (mentions && mentions.length > 0) {
    const rawHandles = Array.from(new Set(mentions.map(m => m.substring(1).toLowerCase())));
    try {
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, push_token, username, full_name');

      if (allProfiles) {
        const matched = allProfiles.filter(p => {
          const u = (p.username || '').toLowerCase();
          const cleanFull = (p.full_name || '').replace(/\s+/g, '').toLowerCase();
          return rawHandles.includes(u) || rawHandles.includes(cleanFull);
        }).filter(p => p.id !== userId);

        for (const target of matched) {
          notifiedUserIds.add(target.id);
          const title = 'You were mentioned in Hub';
          const body = `${authorProfile.full_name} mentioned you: "${message.length > 60 ? message.substring(0, 57) + '...' : message}"`;

          await createNotification(target.id, title, body, 'hub_mention', {
            postId: data.id,
            routeHash,
            authorId: userId,
          });

          if (target.push_token) {
            await sendPushNotification(target.push_token, title, body, {
              type: 'hub_mention',
              postId: data.id,
              routeHash,
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to notify mentioned users:', err);
    }
  }

  // 2. Notify other users tracking this route (only commute routes, ignoring temporary ride request routes)
  const { data: routesData } = await supabase
    .from('routes')
    .select('user_id, label')
    .eq('route_hash', routeHash);

  if (routesData && routesData.length > 0) {
    const userIds = Array.from(new Set(
      routesData
        .filter(r => {
          try {
            JSON.parse(r.label);
            return false;
          } catch {
            return true;
          }
        })
        .map(r => r.user_id)
    )).filter(id => id !== userId && !notifiedUserIds.has(id));
    
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase.from('profiles').select('id, push_token').in('id', userIds);
      
      if (profilesData) {
        profilesData.forEach(p => {
          sendPushNotification(p.push_token, `Community Update: ${statusTag}`, `${authorProfile.full_name} posted an update on your route.`, { type: 'hub_post', routeHash }, p.id);
        });
      }
    }
  }
  
  return {
    ...data,
    author: authorProfile,
    trip: Array.isArray(data.trip) ? data.trip[0] : data.trip,
    likes_count: 0,
    comments_count: 0,
    user_has_liked: false,
    user_reaction: null,
    reactions_count: {},
    recent_comments: [],
  } as HubPostWithAuthor;
};

export const deletePost = async (postId: string, userId: string): Promise<boolean> => {
  try {
    await supabase.from('post_comments').delete().eq('post_id', postId);
    await supabase.from('post_likes').delete().eq('post_id', postId);
  } catch (err) {
    console.warn('Non-fatal error cleaning up post comments/likes:', err);
  }

  const { error } = await supabase
    .from('hub_posts')
    .delete()
    .match({ id: postId, author_id: userId });

  if (error) {
    handleServiceError('Error deleting post:', error);
    return false;
  }
  return true;
};

export const deleteMultiplePosts = async (postIds: string[], userId: string): Promise<boolean> => {
  if (!postIds || postIds.length === 0) return true;

  try {
    await supabase.from('post_comments').delete().in('post_id', postIds);
    await supabase.from('post_likes').delete().in('post_id', postIds);
  } catch (err) {
    console.warn('Non-fatal error cleaning up post comments/likes:', err);
  }

  const { error } = await supabase
    .from('hub_posts')
    .delete()
    .in('id', postIds)
    .eq('author_id', userId);

  if (error) {
    handleServiceError('Error deleting multiple posts:', error);
    return false;
  }
  return true;
};

/** Fetch user's posts that are approaching 1 week (>= 6 days) or past 1 week old */
export const getUserExpiringPosts = async (userId: string, minDaysOld: number = 6): Promise<HubPostWithAuthor[]> => {
  const cutoffDate = new Date(Date.now() - minDaysOld * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('hub_posts')
    .select(`
      *,
      author:profiles!hub_posts_author_id_fkey(*),
      post_likes(count),
      post_comments(count)
    `)
    .eq('author_id', userId)
    .lte('created_at', cutoffDate)
    .order('created_at', { ascending: true });

  if (error) {
    handleServiceError('Error fetching expiring user posts:', error);
    return [];
  }

  return (data || []).map(post => ({
    ...post,
    author: Array.isArray(post.author) ? post.author[0] : post.author,
    likes_count: post.post_likes?.[0]?.count || 0,
    comments_count: post.post_comments?.[0]?.count || 0,
    user_has_liked: false,
    user_reaction: null,
    reactions_count: {},
    recent_comments: [],
  })) as HubPostWithAuthor[];
};

export const updatePost = async (
  postId: string,
  userId: string,
  statusTag: string,
  message: string,
  imageUrls?: string[]
): Promise<HubPostWithAuthor | null> => {
  const updatePayload: any = {
    status_tag: statusTag,
    message,
    edited_at: new Date().toISOString(),
  };

  if (imageUrls !== undefined) {
    updatePayload.image_urls = imageUrls;
  }

  let { data, error } = await supabase
    .from('hub_posts')
    .update(updatePayload)
    .match({ id: postId, author_id: userId })
    .select(`*, author:profiles!hub_posts_author_id_fkey(*)`)
    .maybeSingle();

  if (error && error.message?.includes('hub_posts_status_tag_check') && statusTag === 'ride') {
    updatePayload.status_tag = 'other';
    const retryRes = await supabase
      .from('hub_posts')
      .update(updatePayload)
      .match({ id: postId, author_id: userId })
      .select(`*, author:profiles!hub_posts_author_id_fkey(*)`)
      .maybeSingle();
    data = retryRes.data;
    error = retryRes.error;
  }

  if (error) {
    handleServiceError('Error updating post:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    author: Array.isArray(data.author) ? data.author[0] : data.author,
  } as HubPostWithAuthor;
};

export const deleteAllUserPosts = async (userId: string, routeHash?: string): Promise<boolean> => {
  let query = supabase.from('hub_posts').delete().eq('author_id', userId);
  
  if (routeHash) {
    query = query.eq('route_hash', routeHash);
  }

  const { error } = await query;

  if (error) {
    handleServiceError('Error deleting all user posts:', error);
    return false;
  }
  return true;
};

/** Subscribe to Realtime Hub Posts for a route */
export const subscribeToHubPosts = (
  routeHash: string,
  onPayload: (payload: { eventType: string; new: any; old: any }) => void
) => {
  const channelName = `hub_posts_${routeHash}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'hub_posts',
        filter: `route_hash=eq.${routeHash}`,
      },
      (payload) => {
        onPayload({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
    try {
      (supabase.realtime as any)._remove?.(channel);
    } catch {}
  };
};

/** Subscribe to Realtime Comments for a post */
export const subscribeToComments = (
  postId: string,
  onComment: (comment: PostCommentWithAuthor) => void
) => {
  const channelName = `post_comments_${postId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'post_comments',
        filter: `post_id=eq.${postId}`,
      },
      async (payload) => {
        const { data } = await supabase
          .from('post_comments')
          .select(`*, author:profiles!post_comments_author_id_fkey(*)`)
          .eq('id', payload.new.id)
          .single();
        if (data) {
          onComment({
            ...data,
            author: Array.isArray(data.author) ? data.author[0] : data.author,
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
    try {
      (supabase.realtime as any)._remove?.(channel);
    } catch {}
  };
};
