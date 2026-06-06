import { supabase } from '@/lib/supabase';
import { HubPostWithAuthor, PostCommentWithAuthor } from '@/types/database';

export const getPosts = async (routeHash: string, currentUserId: string): Promise<HubPostWithAuthor[]> => {
  // Fetch posts with author info and counts for likes/comments
  const { data: posts, error } = await supabase
    .from('hub_posts')
    .select(`
      *,
      author:profiles!hub_posts_author_id_fkey(*),
      post_likes(count),
      post_comments(count)
    `)
    .eq('route_hash', routeHash)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  // Fetch the current user's likes for these posts to determine user_has_liked
  let userLikes = new Set<string>();
  if (posts.length && currentUserId) {
    const postIds = posts.map(p => p.id);
    const { data: likes } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', currentUserId)
      .in('post_id', postIds);

    if (likes) {
      likes.forEach(like => userLikes.add(like.post_id));
    }
  }

  // Map the response to our HubPostWithAuthor type
  return posts.map(post => ({
    ...post,
    author: Array.isArray(post.author) ? post.author[0] : post.author, // Handle one-to-one relation parsing
    likes_count: post.post_likes?.[0]?.count || 0,
    comments_count: post.post_comments?.[0]?.count || 0,
    user_has_liked: userLikes.has(post.id)
  }));
};

export const toggleLike = async (postId: string, userId: string, currentlyLiked: boolean): Promise<boolean> => {
  if (currentlyLiked) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .match({ post_id: postId, user_id: userId });
    
    if (error) {
      console.error('Error unliking post:', error);
      return false;
    }
  } else {
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId });
      
    if (error) {
      console.error('Error liking post:', error);
      return false;
    }
  }
  return true;
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
    console.error('Error fetching comments:', error);
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
  locationLabel?: string
) => {
  const { data, error } = await supabase
    .from('hub_posts')
    .insert({
      author_id: userId,
      route_hash: routeHash,
      status_tag: statusTag,
      message,
      location_lat: locationLat,
      location_lng: locationLng,
      location_label: locationLabel
    })
    .select(`
      *,
      author:profiles!hub_posts_author_id_fkey(*)
    `)
    .single();

  if (error) throw error;
  
  return {
    ...data,
    author: Array.isArray(data.author) ? data.author[0] : data.author,
    likes_count: 0,
    comments_count: 0,
    user_has_liked: false
  } as HubPostWithAuthor;
};
