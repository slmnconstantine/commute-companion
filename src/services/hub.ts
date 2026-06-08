import { supabase } from '@/lib/supabase';
import { HubPostWithAuthor, PostCommentWithAuthor } from '@/types/database';
import { sendPushNotification } from './pushNotifications';

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
    
    // Send push notification to the post author
    const { data: postData } = await supabase.from('hub_posts').select('author_id').eq('id', postId).single();
    if (postData && postData.author_id !== userId) {
      const { data: authorData } = await supabase.from('profiles').select('push_token').eq('id', postData.author_id).single();
      const { data: likerData } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
      if (authorData?.push_token && likerData?.full_name) {
        sendPushNotification(authorData.push_token, 'New Like ❤️', `${likerData.full_name} liked your post!`, { type: 'hub_post', postId });
      }
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
  
  // Send push notification to the post author
  const { data: postData } = await supabase.from('hub_posts').select('author_id').eq('id', postId).single();
  if (postData && postData.author_id !== userId) {
    const { data: authorData } = await supabase.from('profiles').select('push_token').eq('id', postData.author_id).single();
    const commenterName = Array.isArray(data.author) ? data.author[0].full_name : data.author.full_name;
    if (authorData?.push_token && commenterName) {
      sendPushNotification(authorData.push_token, 'New Comment 💬', `${commenterName} commented: "${content}"`, { type: 'hub_post', postId });
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
  
  const authorProfile = Array.isArray(data.author) ? data.author[0] : data.author;
  
  // Notify other users tracking this route
  const { data: routesData, error: routesError } = await supabase.from('routes').select('user_id').eq('route_hash', routeHash);
  console.log("Found routes for push:", routesData, "Error:", routesError);
  
  if (routesData && routesData.length > 0) {
    const userIds = Array.from(new Set(routesData.map(r => r.user_id))).filter(id => id !== userId);
    console.log("Filtered userIds for push:", userIds);
    
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('push_token').in('id', userIds);
      console.log("Fetched profiles for push:", profilesData, "Error:", profilesError);
      
      if (profilesData) {
        profilesData.forEach(p => {
          if (p.push_token) {
            console.log("Sending push to:", p.push_token);
            sendPushNotification(p.push_token, `Community Update: ${statusTag}`, `${authorProfile.full_name} posted an update on your route.`, { type: 'hub_post', routeHash });
          }
        });
      }
    }
  }
  
  return {
    ...data,
    author: authorProfile,
    likes_count: 0,
    comments_count: 0,
    user_has_liked: false
  } as HubPostWithAuthor;
};

export const deletePost = async (postId: string, userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('hub_posts')
    .delete()
    .match({ id: postId, author_id: userId });

  if (error) {
    console.error('Error deleting post:', error);
    return false;
  }
  return true;
};

export const updatePost = async (postId: string, userId: string, statusTag: string, message: string): Promise<HubPostWithAuthor | null> => {
  const { data, error } = await supabase
    .from('hub_posts')
    .update({ status_tag: statusTag, message })
    .match({ id: postId, author_id: userId })
    .select(`*, author:profiles!hub_posts_author_id_fkey(*)`)
    .single();

  if (error) {
    console.error('Error updating post:', error);
    return null;
  }

  return {
    ...data,
    author: Array.isArray(data.author) ? data.author[0] : data.author,
  } as HubPostWithAuthor;
};

export const deleteAllUserPosts = async (userId: string, routeHash: string): Promise<boolean> => {
  const { error } = await supabase
    .from('hub_posts')
    .delete()
    .match({ author_id: userId, route_hash: routeHash });

  if (error) {
    console.error('Error deleting all user posts:', error);
    return false;
  }
  return true;
};
