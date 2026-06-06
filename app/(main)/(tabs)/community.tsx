/**
 * Route Community Tab
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useRoute } from '@/context/RouteContext';
import { useAuth } from '@/context/AuthContext';
import EmptyState from '@/components/common/EmptyState';
import { getPosts, toggleLike, createPost, getComments, createComment } from '@/services/hub';
import { HubPostWithAuthor, PostCommentWithAuthor } from '@/types/database';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  traffic: { label: 'Traffic', color: '#EF4444', icon: 'car-outline' },
  delay: { label: 'Delay', color: '#F59E0B', icon: 'warning-outline' },
  full: { label: 'Full', color: '#8B5CF6', icon: 'people-outline' },
  clear: { label: 'Clear', color: '#10B981', icon: 'checkmark-circle-outline' },
  other: { label: 'Other', color: '#3B82F6', icon: 'chatbubble-outline' },
};

// ── PostCard Component ────────────────────────────────────────────────────────

function PostCard({
  post,
  theme,
  onLike,
  onCommentClick
}: {
  post: HubPostWithAuthor;
  theme: ReturnType<typeof useTheme>['theme'];
  onLike: (postId: string, currentlyLiked: boolean) => void;
  onCommentClick: (post: HubPostWithAuthor) => void;
}) {
  const config = STATUS_CONFIG[post.status_tag] || STATUS_CONFIG.other;
  
  // Format date loosely
  const date = new Date(post.created_at);
  const timeAgo = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.postCard, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
      <View style={styles.authorRow}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary, overflow: 'hidden' }]}>
          {post.author?.avatar_url ? (
            <Image source={{ uri: post.author.avatar_url }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Text style={[styles.avatarText, { color: theme.colors.white }]}>
              {post.author?.full_name?.charAt(0).toUpperCase() || '?'}
            </Text>
          )}
        </View>
        <View style={styles.authorInfo}>
          <Text style={[theme.typography.caption, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
            {post.author?.full_name || 'Anonymous'}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} />
            <Text style={[theme.typography.small, { color: theme.colors.textMuted, marginLeft: 3 }]}>
              {timeAgo}
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: `${config.color}18` }]}>
          <Ionicons name={config.icon} size={11} color={config.color} />
          <Text style={[theme.typography.small, { fontSize: 10, color: config.color, fontFamily: 'Inter-Medium', marginLeft: 4 }]}>
            {config.label}
          </Text>
        </View>
      </View>

      <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 12 }]}>
        {post.message}
      </Text>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
        <Text style={[theme.typography.small, { color: theme.colors.textMuted, marginLeft: 4 }]} numberOfLines={1}>
          {post.location_label || `${post.location_lat.toFixed(4)}, ${post.location_lng.toFixed(4)}`}
        </Text>
      </View>

      <View style={[styles.actionsRow, { borderTopColor: theme.colors.border }]}>
        <Pressable style={styles.actionBtn} onPress={() => onLike(post.id, !!post.user_has_liked)}>
          <Ionicons
            name={post.user_has_liked ? "heart" : "heart-outline"}
            size={18}
            color={post.user_has_liked ? theme.colors.error : theme.colors.textMuted}
          />
          <Text style={[theme.typography.small, { color: post.user_has_liked ? theme.colors.error : theme.colors.textMuted, marginLeft: 5 }]}>
            {post.likes_count || 0}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => onCommentClick(post)}>
          <Ionicons name="chatbubble-outline" size={16} color={theme.colors.textMuted} />
          <Text style={[theme.typography.small, { color: theme.colors.textMuted, marginLeft: 5 }]}>
            {post.comments_count || 0}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Route Banner ──────────────────────────────────────────────────────────────

function RouteBanner({ theme, activeRoute }: { theme: any; activeRoute: any }) {
  return (
    <View style={[styles.routeBanner, { backgroundColor: `${theme.colors.primary}10`, borderColor: `${theme.colors.primary}25` }]}>
      <View style={styles.routeBannerRoute}>
        <View style={styles.routeBannerDots}>
          <View style={[styles.routeBannerDotGreen, { backgroundColor: theme.colors.success }]} />
          <View style={[styles.routeBannerLine, { backgroundColor: theme.colors.border }]} />
          <View style={[styles.routeBannerDotRed, { backgroundColor: theme.colors.error }]} />
        </View>
        <View style={styles.routeBannerLabels}>
          <Text style={[theme.typography.caption, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]} numberOfLines={1}>
            {activeRoute.origin_label.split(',')[0]}
          </Text>
          <Text style={[theme.typography.caption, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]} numberOfLines={1}>
            {activeRoute.destination_label.split(',')[0]}
          </Text>
        </View>
      </View>
      <View style={styles.routeBannerMeta}>
        <Ionicons name="people" size={14} color={theme.colors.primary} />
        <Text style={[theme.typography.small, { color: theme.colors.primary, fontFamily: 'Inter-Medium', marginLeft: 4 }]}>
          Route Community
        </Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const { theme } = useTheme();
  const { activeRoute } = useRoute();
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [posts, setPosts] = useState<HubPostWithAuthor[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // New Post State
  const [newPostVisible, setNewPostVisible] = useState(false);
  const [newPostMessage, setNewPostMessage] = useState('');
  const [selectedTag, setSelectedTag] = useState('other');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Comments State
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [activePost, setActivePost] = useState<HubPostWithAuthor | null>(null);
  const [comments, setComments] = useState<PostCommentWithAuthor[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!activeRoute || !activeRoute.route_hash || !profile) {
      setLoading(false);
      return;
    }
    const data = await getPosts(activeRoute.route_hash, profile.id);
    setPosts(data);
    setLoading(false);
  }, [activeRoute, profile]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!profile) return;
    
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          user_has_liked: !currentlyLiked,
          likes_count: (p.likes_count || 0) + (currentlyLiked ? -1 : 1)
        };
      }
      return p;
    }));

    const success = await toggleLike(postId, profile.id, currentlyLiked);
    if (!success) {
      // Revert if failed
      loadPosts();
    }
  };

  const handleSubmitPost = async () => {
    if (!profile || !activeRoute || !activeRoute.route_hash || !newPostMessage.trim()) return;
    
    setIsSubmitting(true);
    try {
      const post = await createPost(
        profile.id,
        activeRoute.route_hash,
        selectedTag,
        newPostMessage.trim(),
        activeRoute.origin_lat,
        activeRoute.origin_lng,
        activeRoute.origin_label.split(',')[0]
      );
      
      setPosts([post, ...posts]);
      setNewPostVisible(false);
      setNewPostMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openComments = async (post: HubPostWithAuthor) => {
    setActivePost(post);
    setCommentsVisible(true);
    setCommentsLoading(true);
    const data = await getComments(post.id);
    setComments(data);
    setCommentsLoading(false);
  };

  const handleSubmitComment = async () => {
    if (!profile || !activePost || !newComment.trim()) return;
    
    try {
      const comment = await createComment(activePost.id, profile.id, newComment.trim());
      setComments([...comments, comment]);
      setNewComment('');
      
      // Update comment count on post
      setPosts(prev => prev.map(p => {
        if (p.id === activePost.id) {
          return { ...p, comments_count: (p.comments_count || 0) + 1 };
        }
        return p;
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const hasRoute = !!activeRoute;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[theme.typography.heading, { color: theme.colors.text }]}>Route Community</Text>
      </View>

      {!hasRoute ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="compass-outline"
            title="Set Your Commute Route"
            message="Set your daily commute route to join a community of commuters who share the same path. Get real-time traffic updates, tips, and more!"
            actionLabel="Set Route"
            onAction={() => router.push('/(main)/ride/set-route' as any)}
          />
        </View>
      ) : (
        <>
          <RouteBanner theme={theme} activeRoute={activeRoute} />
          <ScrollView
            style={styles.feed}
            contentContainerStyle={styles.feedContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
            ) : posts.length === 0 ? (
              <EmptyState icon="chatbubble-outline" title="No posts yet" message="Be the first to post an update on this route!" />
            ) : (
              posts.map((post) => (
                <PostCard key={post.id} post={post} theme={theme} onLike={handleLike} onCommentClick={openComments} />
              ))
            )}
          </ScrollView>

          <Pressable style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={() => setNewPostVisible(true)}>
            <Ionicons name="create-outline" size={22} color={theme.colors.white} />
            <Text style={[theme.typography.caption, { color: theme.colors.white, fontFamily: 'Inter-SemiBold', marginLeft: 8 }]}>New Post</Text>
          </Pressable>
        </>
      )}

      {/* NEW POST MODAL */}
      <Modal visible={newPostVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background, paddingBottom: insets.bottom || 20 }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setNewPostVisible(false)}>
                <Text style={{ color: theme.colors.textMuted }}>Cancel</Text>
              </Pressable>
              <Text style={[theme.typography.subtitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>New Update</Text>
              <Pressable onPress={handleSubmitPost} disabled={!newPostMessage.trim() || isSubmitting}>
                <Text style={{ color: newPostMessage.trim() ? theme.colors.primary : theme.colors.textMuted, fontFamily: 'Inter-SemiBold' }}>
                  {isSubmitting ? 'Posting...' : 'Post'}
                </Text>
              </Pressable>
            </View>
            
            <View style={styles.tagSelector}>
              {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((tag) => (
                <Pressable
                  key={tag}
                  style={[
                    styles.tagChip,
                    { backgroundColor: selectedTag === tag ? STATUS_CONFIG[tag].color : theme.colors.surface }
                  ]}
                  onPress={() => setSelectedTag(tag)}
                >
                  <Text style={{ color: selectedTag === tag ? '#FFF' : theme.colors.text, fontSize: 12 }}>
                    {STATUS_CONFIG[tag].label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={[styles.postInput, { color: theme.colors.text, backgroundColor: theme.colors.surface }]}
              placeholder="What's happening on your route?"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              autoFocus
              value={newPostMessage}
              onChangeText={setNewPostMessage}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* COMMENTS MODAL */}
      <Modal visible={commentsVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.commentsContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[theme.typography.subtitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>Comments</Text>
              <Pressable onPress={() => setCommentsVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.commentsList}>
              {commentsLoading ? (
                <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
              ) : comments.length === 0 ? (
                <Text style={{ textAlign: 'center', color: theme.colors.textMuted, marginTop: 20 }}>No comments yet.</Text>
              ) : (
                comments.map(c => (
                  <View key={c.id} style={[styles.commentItem, { borderBottomColor: theme.colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {c.author?.avatar_url ? (
                        <Image source={{ uri: c.author.avatar_url }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }} />
                      ) : (
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                          <Text style={{ color: theme.colors.white, fontSize: 10, fontFamily: 'Inter-SemiBold' }}>
                            {c.author?.full_name?.charAt(0).toUpperCase() || '?'}
                          </Text>
                        </View>
                      )}
                      <Text style={[theme.typography.caption, { fontFamily: 'Inter-SemiBold', color: theme.colors.text }]}>
                        {c.author?.username || c.author?.full_name || 'Anonymous'}
                      </Text>
                    </View>
                    <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4, marginLeft: 32 }]}>
                      {c.content}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={[styles.commentInputRow, { borderTopColor: theme.colors.border, paddingBottom: insets.bottom || 10 }]}>
              <TextInput
                style={[styles.commentInput, { color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                placeholder="Write a comment..."
                placeholderTextColor={theme.colors.textMuted}
                value={newComment}
                onChangeText={setNewComment}
              />
              <Pressable style={styles.sendBtn} onPress={handleSubmitComment} disabled={!newComment.trim()}>
                <Ionicons name="send" size={20} color={newComment.trim() ? theme.colors.primary : theme.colors.textMuted} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  routeBanner: { marginHorizontal: 20, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  routeBannerRoute: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeBannerDots: { alignItems: 'center', width: 10 },
  routeBannerDotGreen: { width: 8, height: 8, borderRadius: 4 },
  routeBannerLine: { width: 1.5, height: 10, marginVertical: 1 },
  routeBannerDotRed: { width: 8, height: 8, borderRadius: 4 },
  routeBannerLabels: { flex: 1, gap: 4 },
  routeBannerMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(13, 148, 136, 0.15)' },
  feed: { flex: 1 },
  feedContent: { paddingHorizontal: 20, paddingBottom: 100 },
  postCard: { borderRadius: 16, padding: 16, marginBottom: 14, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 4 },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter-SemiBold', fontSize: 14 },
  authorInfo: { flex: 1, marginLeft: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, gap: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 88, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  
  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { height: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  tagSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  postInput: { flex: 1, borderRadius: 12, padding: 16, textAlignVertical: 'top', fontSize: 16 },
  
  commentsContent: { height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  commentsList: { flex: 1, marginBottom: 10 },
  commentItem: { paddingVertical: 12, borderBottomWidth: 1 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 10 },
  commentInput: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 10 },
  sendBtn: { padding: 10 },
});
