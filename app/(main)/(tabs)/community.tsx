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
  Alert,
  Animated,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { useRoute } from '@/context/RouteContext';
import { useAuth } from '@/context/AuthContext';
import EmptyState from '@/components/common/EmptyState';
import GlassCard from '@/components/common/GlassCard';
import { getPosts, toggleLike, createPost, getComments, createComment, deletePost, updatePost } from '@/services/hub';
import { HubPostWithAuthor, PostCommentWithAuthor } from '@/types/database';
import HubPostCard, { STATUS_CONFIG } from '@/components/community/HubPostCard';
import ProfileCardModal from '@/components/common/ProfileCardModal';

// ── Route Banner ──────────────────────────────────────────────────────────────

function RouteBanner({ theme, activeRoute }: { theme: any; activeRoute: any }) {
  return (
    <LinearGradient
      colors={[`${theme.colors.primary}25`, `${theme.colors.primary}05`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.routeBanner, { borderColor: `${theme.colors.primary}30` }]}
    >
      <View style={styles.routeBannerRoute}>
        <View style={styles.routeBannerDots}>
          <View style={[styles.routeBannerDotGreen, { backgroundColor: theme.colors.success }]} />
          <View style={[styles.routeBannerLine, { backgroundColor: theme.colors.primarySubtle }]} />
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
        <Ionicons name="people" size={16} color={theme.colors.primary} />
        <Text style={[theme.typography.small, { color: theme.colors.primary, fontFamily: 'Inter-SemiBold', marginLeft: 6 }]}>
          Route Community
        </Text>
      </View>
    </LinearGradient>
  );
}

// Simple time ago formatter for comments
function formatCommentTime(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch (e) {
    return '';
  }
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

  // New/Edit Post State
  const [newPostVisible, setNewPostVisible] = useState(false);
  const [newPostMessage, setNewPostMessage] = useState('');
  const [selectedTag, setSelectedTag] = useState('other');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Comments State
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [activePost, setActivePost] = useState<HubPostWithAuthor | null>(null);
  const [comments, setComments] = useState<PostCommentWithAuthor[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Profile Modal State
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

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

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('refresh_data', () => {
      loadPosts();
    });
    return () => sub.remove();
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

  const handleDeletePost = (postId: string) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            if (!profile) return;
            
            // Optimistically remove the post
            setPosts(prev => prev.filter(p => p.id !== postId));
            
            const success = await deletePost(postId, profile.id);
            if (!success) {
              // Revert if failed
              loadPosts();
            }
          }
        }
      ]
    );
  };

  const handleEditClick = (post: HubPostWithAuthor) => {
    setEditingPostId(post.id);
    setNewPostMessage(post.message);
    setSelectedTag(post.status_tag);
    setNewPostVisible(true);
  };

  const closePostModal = () => {
    setNewPostVisible(false);
    setEditingPostId(null);
    setNewPostMessage('');
    setSelectedTag('other');
  };

  const confirmSubmitPost = () => {
    if (editingPostId) {
      Alert.alert(
        "Save Changes",
        "Are you sure you want to update this post?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save", onPress: executeSubmitPost }
        ]
      );
    } else {
      executeSubmitPost();
    }
  };

  const executeSubmitPost = async () => {
    if (!profile || !activeRoute || !activeRoute.route_hash || !newPostMessage.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingPostId) {
        const updatedPost = await updatePost(editingPostId, profile.id, selectedTag, newPostMessage.trim());
        if (updatedPost) {
          // Preserve like and comment counts locally
          setPosts(prev => prev.map(p => {
            if (p.id === editingPostId) {
              return {
                ...updatedPost,
                likes_count: p.likes_count,
                comments_count: p.comments_count,
                user_has_liked: p.user_has_liked
              };
            }
            return p;
          }));
        }
      } else {
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
      }
      closePostModal();
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
        <Text style={[theme.typography.heading, { color: theme.colors.text }]}>Community Hub</Text>
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
              <>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={[styles.postCard, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
                    <View style={styles.authorRow}>
                      <View style={[styles.avatar, { backgroundColor: theme.colors.border }]} />
                      <View style={styles.authorInfo}>
                        <View style={{ width: 100, height: 14, backgroundColor: theme.colors.border, borderRadius: 4, marginBottom: 6 }} />
                        <View style={{ width: 60, height: 10, backgroundColor: theme.colors.border, borderRadius: 4 }} />
                      </View>
                    </View>
                    <View style={{ marginTop: 14 }}>
                      <View style={{ width: '90%', height: 12, backgroundColor: theme.colors.border, borderRadius: 4, marginBottom: 8 }} />
                      <View style={{ width: '70%', height: 12, backgroundColor: theme.colors.border, borderRadius: 4 }} />
                    </View>
                  </View>
                ))}
              </>
            ) : posts.length === 0 ? (
              <EmptyState icon="chatbubble-outline" title="No posts yet" message="Be the first to post an update on this route!" />
            ) : (
              posts.map((post) => (
                <HubPostCard
                  key={post.id}
                  post={post}
                  currentUserId={profile?.id}
                  onLike={handleLike}
                  onCommentClick={(p) => {
                    setActivePost(p);
                    setCommentsVisible(true);
                    openComments(p);
                  }}
                  onDelete={handleDeletePost}
                  onEditClick={(p) => {
                    setEditingPostId(p.id);
                    setNewPostMessage(p.message);
                    setSelectedTag(p.status_tag);
                    setNewPostVisible(true);
                  }}
                  onAvatarPress={(userId) => {
                    setSelectedProfileId(userId);
                    setProfileModalVisible(true);
                  }}
                />
              ))
            )}
          </ScrollView>

          <GlassCard
            backgroundColor={theme.colors.primary}
            borderColor="transparent"
            borderRadius={18}
            style={styles.fabContainer}
          >
            <Pressable
              style={({ pressed }) => [
                styles.fabInner,
                { transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
              onPress={() => {
                if (activeRoute) {
                  setNewPostVisible(true);
                } else {
                  Alert.alert("Route Required", "Please set a commute route first to post to its community.");
                }
              }}
            >
              <Ionicons name="create" size={20} color="#fff" />
              <Text style={[theme.typography.body, { color: '#fff', fontFamily: 'Inter-SemiBold', marginLeft: 8 }]}>
                New Post
              </Text>
            </Pressable>
          </GlassCard>
        </>
      )}

      {/* NEW/EDIT POST MODAL */}
      <Modal visible={newPostVisible} animationType="slide" transparent={true} onRequestClose={closePostModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background, paddingBottom: insets.bottom || 20 }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />
            
            <View style={styles.modalHeader}>
              <Pressable onPress={closePostModal} style={{ padding: 4 }}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 15, fontFamily: 'Inter-Medium' }}>Cancel</Text>
              </Pressable>
              <Text style={[theme.typography.subtitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 17 }]}>
                {editingPostId ? 'Edit Update' : 'New Update'}
              </Text>
              <Pressable 
                onPress={confirmSubmitPost} 
                disabled={!newPostMessage.trim() || isSubmitting}
                style={[
                  styles.postButton, 
                  { 
                    backgroundColor: newPostMessage.trim() ? theme.colors.primary : `${theme.colors.primary}20` 
                  }
                ]}
              >
                <Text style={{ 
                  color: newPostMessage.trim() ? theme.colors.white : theme.colors.textMuted, 
                  fontFamily: 'Inter-SemiBold', 
                  fontSize: 13 
                }}>
                  {isSubmitting ? (editingPostId ? 'Saving...' : 'Posting...') : (editingPostId ? 'Save' : 'Post')}
                </Text>
              </Pressable>
            </View>

            {/* Author details and route badge */}
            <View style={styles.authorBadgeRow}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary, width: 36, height: 36, borderRadius: 18, overflow: 'hidden' }]}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={[styles.avatarText, { color: theme.colors.white, fontSize: 13, fontFamily: 'Inter-SemiBold' }]}>
                    {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                )}
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 14, fontFamily: 'Inter-SemiBold' }}>
                  {profile?.full_name || 'Anonymous'}
                </Text>
                {activeRoute && (
                  <View style={styles.routeBadge}>
                    <Ionicons name="git-branch-outline" size={11} color={theme.colors.primary} />
                    <Text style={{ color: theme.colors.primary, fontSize: 10, fontFamily: 'Inter-Medium', marginLeft: 3 }} numberOfLines={1}>
                      {activeRoute.origin_label.split(',')[0]} ➔ {activeRoute.destination_label.split(',')[0]}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Tag Selector with Icons */}
            <View style={styles.tagSelector}>
              {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((tag) => {
                const isSelected = selectedTag === tag;
                const config = STATUS_CONFIG[tag];
                return (
                  <Pressable
                    key={tag}
                    style={[
                      styles.tagChip,
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isSelected ? `${config.color}18` : theme.colors.surface,
                        borderColor: isSelected ? config.color : theme.colors.border,
                        borderWidth: isSelected ? 1.5 : 1,
                      }
                    ]}
                    onPress={() => setSelectedTag(tag)}
                  >
                    <Ionicons 
                      name={config.icon} 
                      size={12} 
                      color={isSelected ? config.color : theme.colors.textMuted} 
                      style={{ marginRight: 4 }}
                    />
                    <Text 
                      style={{ 
                        color: isSelected ? config.color : theme.colors.text, 
                        fontSize: 12,
                        fontFamily: isSelected ? 'Inter-SemiBold' : 'Inter-Regular'
                      }}
                    >
                      {config.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Content Input Area */}
            <View style={{ flex: 1, marginTop: 10 }}>
              <TextInput
                style={[styles.postInput, { color: theme.colors.text }]}
                placeholder="What's happening on your route?"
                placeholderTextColor={theme.colors.textMuted}
                multiline
                autoFocus
                maxLength={280}
                value={newPostMessage}
                onChangeText={setNewPostMessage}
              />
              <View style={styles.inputFooter}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontFamily: 'Inter-Regular' }}>
                  {280 - newPostMessage.length} characters remaining
                </Text>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* COMMENTS MODAL */}
      <Modal visible={commentsVisible} animationType="slide" transparent={true} onRequestClose={() => setCommentsVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.commentsContent, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={[theme.typography.subtitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 17 }]}>Comments</Text>
                {activePost && (
                  <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontFamily: 'Inter-Regular', marginTop: 2 }}>
                    on {activePost.author?.full_name || 'Anonymous'}'s update
                  </Text>
                )}
              </View>
              <Pressable onPress={() => setCommentsVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.commentsList}>
              {commentsLoading ? (
                <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
              ) : comments.length === 0 ? (
                <View style={styles.emptyCommentsContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color={`${theme.colors.primary}40`} />
                  <Text style={{ color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 15, marginTop: 12 }}>No comments yet</Text>
                  <Text style={{ color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                    Be the first to share your thoughts!
                  </Text>
                </View>
              ) : (
                comments.map(c => (
                  <View key={c.id} style={[styles.commentItem, { borderBottomColor: `${theme.colors.border}40` }]}>
                    <Pressable onPress={() => {
                      if (c.author_id) {
                        setSelectedProfileId(c.author_id);
                        setProfileModalVisible(true);
                      }
                    }}>
                      {c.author?.avatar_url ? (
                        <Image source={{ uri: c.author.avatar_url }} style={styles.commentAvatar} />
                      ) : (
                        <View style={[styles.commentAvatar, { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                          <Text style={{ color: theme.colors.white, fontSize: 11, fontFamily: 'Inter-SemiBold' }}>
                            {c.author?.full_name?.charAt(0).toUpperCase() || '?'}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                    <View style={styles.commentBubble}>
                      <View style={styles.commentHeaderRow}>
                        <Text style={{ fontFamily: 'Inter-SemiBold', color: theme.colors.text, fontSize: 13 }}>
                          {c.author?.full_name || 'Anonymous'}
                        </Text>
                        {c.created_at && (
                          <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginLeft: 6 }}>
                            • {formatCommentTime(c.created_at)}
                          </Text>
                        )}
                      </View>
                      <Text style={{ color: theme.colors.text, marginTop: 4, fontSize: 14, lineHeight: 18, fontFamily: 'Inter-Regular' }}>
                        {c.content}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={[styles.commentInputRow, { borderTopColor: theme.colors.border, paddingBottom: insets.bottom || 10 }]}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={[styles.commentAvatar, { marginRight: 8 }]} />
              ) : (
                <View style={[styles.commentAvatar, { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8 }]}>
                  <Text style={{ color: theme.colors.white, fontSize: 11, fontFamily: 'Inter-SemiBold' }}>
                    {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              <TextInput
                style={[styles.commentInput, { color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                placeholder="Write a comment..."
                placeholderTextColor={theme.colors.textMuted}
                value={newComment}
                onChangeText={setNewComment}
              />
              <Pressable 
                style={[
                  styles.sendCircleBtn, 
                  { 
                    backgroundColor: newComment.trim() ? theme.colors.primary : `${theme.colors.primary}20`
                  }
                ]} 
                onPress={handleSubmitComment} 
                disabled={!newComment.trim()}
              >
                <Ionicons name="send" size={13} color={newComment.trim() ? theme.colors.white : theme.colors.textMuted} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Profile Modal */}
      <ProfileCardModal 
        userId={selectedProfileId} 
        visible={profileModalVisible} 
        onClose={() => setProfileModalVisible(false)} 
      />
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
  fabContainer: { position: 'absolute', right: 20, bottom: 88, overflow: 'hidden' },
  fabInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { height: '75%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10 },
  postButton: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  authorBadgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  routeBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 2, backgroundColor: 'rgba(13, 148, 136, 0.08)', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  postInput: { flex: 1, textAlignVertical: 'top', fontSize: 16, padding: 4, marginTop: 8 },
  inputFooter: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 8, paddingHorizontal: 4 },

  commentsContent: { height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  commentsList: { flex: 1, marginBottom: 10 },
  commentItem: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, alignItems: 'flex-start' },
  commentAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentBubble: { flex: 1, marginLeft: 10 },
  commentHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 12 },
  commentInput: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, fontSize: 14 },
  sendCircleBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  emptyCommentsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
});
