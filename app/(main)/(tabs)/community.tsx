/**
 * Route Community Tab - Upgraded with Realtime Feed, Search & Filter, Reactions,
 * Image Attachments, Post Pinning, Inline Comments, and Reporting.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
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
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { useRoute } from '@/context/RouteContext';
import { useAuth } from '@/context/AuthContext';
import EmptyState from '@/components/common/EmptyState';
import GlassCard from '@/components/common/GlassCard';
import HubPostSkeleton from '@/components/common/HubPostSkeleton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPosts,
  toggleReaction,
  createPost,
  getComments,
  createComment,
  deletePost,
  updatePost,
  getUserExpiringPosts,
  deleteMultiplePosts,
  subscribeToHubPosts,
  subscribeToComments,
} from '@/services/hub';
import { uploadHubPostImage, pickHubImage } from '@/services/storage';
import { HubPostWithAuthor, PostCommentWithAuthor } from '@/types/database';
import HubPostCard, { STATUS_CONFIG } from '@/components/community/HubPostCard';
import ProfileCardModal from '@/components/common/ProfileCardModal';
import ImageViewerModal from '@/components/community/ImageViewerModal';
import ReportPostModal from '@/components/community/ReportPostModal';
import { HubReactionType } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

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

// Simple time ago formatter for comments and stale posts
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
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
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
  const { mention, postId } = useLocalSearchParams<{ mention?: string; postId?: string }>();

  const [posts, setPosts] = useState<HubPostWithAuthor[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Filter State
  const [selectedFilterTag, setSelectedFilterTag] = useState('all');

  // Highlighted post from notification
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(postId || null);
  const lastScrolledPostId = useRef<string | null>(null);

  // Realtime new updates toast
  const [unreadNewCount, setUnreadNewCount] = useState(0);
  const isScrolledDown = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  // New/Edit Post State
  const [newPostVisible, setNewPostVisible] = useState(false);
  const [newPostMessage, setNewPostMessage] = useState('');
  const [selectedTag, setSelectedTag] = useState('other');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<{ uri: string; base64: string }[]>([]);

  // Comments State
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [activePost, setActivePost] = useState<HubPostWithAuthor | null>(null);
  const [comments, setComments] = useState<PostCommentWithAuthor[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Profile Modal State
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Expiring/Old posts cleanup state
  const [expiringPosts, setExpiringPosts] = useState<HubPostWithAuthor[]>([]);
  const [showExpiringBanner, setShowExpiringBanner] = useState(true);

  // Image Viewer Modal State
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Report Modal State
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);

  // ── Load Posts ──────────────────────────────────────────────────────────────

  const loadPosts = useCallback(async (reset: boolean = true): Promise<void> => {
    const routeHash = activeRoute?.route_hash;
    const profileId = profile?.id;
    if (!routeHash || !profileId) {
      setLoading(false);
      return;
    }

    if (reset) {
      setLoading(true);
    }

    const offset = reset ? 0 : posts.length;
    // When navigating from a mention notification with a postId, load an expanded batch
    // so all preceding posts are loaded and visible in their natural feed order
    const fetchLimit = reset && postId ? 50 : 20;

    let data = await getPosts(routeHash, profileId, {
      tag: selectedFilterTag,
      limit: fetchLimit,
      offset,
    });

    // If reset and postId is specified, make sure the target post is included in the loaded feed
    if (reset && postId && !data.some((p) => p.id === postId)) {
      const expandedData = await getPosts(routeHash, profileId, {
        tag: selectedFilterTag,
        limit: 100,
        offset: 0,
      });

      if (expandedData.some((p) => p.id === postId)) {
        data = expandedData;
      } else {
        // As a resilient fallback, fetch the target post and place it in its chronological position
        try {
          const { data: targetPostData } = await supabase
            .from('hub_posts')
            .select(`
              *,
              author:profiles!hub_posts_author_id_fkey(*),
              trip:trips(*),
              post_likes(count),
              post_comments(count)
            `)
            .eq('id', postId)
            .maybeSingle();

          if (targetPostData) {
            const formattedTarget: HubPostWithAuthor = {
              ...targetPostData,
              author: Array.isArray(targetPostData.author) ? targetPostData.author[0] : targetPostData.author,
              trip: Array.isArray(targetPostData.trip) ? targetPostData.trip[0] : targetPostData.trip,
              likes_count: targetPostData.post_likes?.[0]?.count ?? 0,
              comments_count: targetPostData.post_comments?.[0]?.count ?? 0,
              user_has_liked: false,
            };

            data = [...data, formattedTarget].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          }
        } catch (err) {
          console.warn('[Community] Error loading target post into feed:', err);
        }
      }
    }

    if (reset) {
      setPosts(data);
      setHasMore(data.length >= fetchLimit);
      setLoading(false);
    } else {
      setPosts(prev => [...prev, ...data]);
      setHasMore(data.length >= 20);
      setLoadingMore(false);
    }
  }, [activeRoute?.route_hash, profile?.id, selectedFilterTag, posts.length, postId]);

  // Handle Tag or ActiveRoute changes
  useEffect(() => {
    loadPosts(true);
  }, [selectedFilterTag, activeRoute?.route_hash]);

  // Refetch when tab is brought to foreground / focused
  useFocusEffect(
    useCallback(() => {
      loadPosts(true);
    }, [loadPosts])
  );

  const handleEndReached = () => {
    if (!loading && !loadingMore && hasMore) {
      setLoadingMore(true);
      loadPosts(false);
    }
  };

  // ── Realtime Subscriptions ──────────────────────────────────────────────────

  useEffect(() => {
    const routeHash = activeRoute?.route_hash;
    const profileId = profile?.id;
    if (!routeHash || !profileId) return;

    const unsubscribe = subscribeToHubPosts(routeHash, async (payload) => {
      if (payload.eventType === 'INSERT') {
        const fresh = await getPosts(routeHash, profileId, { limit: 1 });
        if (fresh.length > 0) {
          const newPost = fresh[0];
          if (newPost.author_id === profileId) {
            setPosts((prev) => (prev.some((p) => p.id === newPost.id) ? prev : [newPost, ...prev]));
          } else {
            if (isScrolledDown.current) {
              setUnreadNewCount((c) => c + 1);
            } else {
              setPosts((prev) => (prev.some((p) => p.id === newPost.id) ? prev : [newPost, ...prev]));
            }
          }
        }
      } else if (payload.eventType === 'UPDATE') {
        setPosts((prev) =>
          prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
        );
      } else if (payload.eventType === 'DELETE') {
        setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeRoute?.route_hash, profile?.id]);

  // Realtime comments subscription
  useEffect(() => {
    if (!commentsVisible || !activePost) return;

    const unsubscribe = subscribeToComments(activePost.id, (incomingComment) => {
      setComments((prev) => {
        if (prev.some((c) => c.id === incomingComment.id)) return prev;
        return [...prev, incomingComment];
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === activePost.id ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p))
      );
    });

    return () => {
      unsubscribe();
    };
  }, [commentsVisible, activePost?.id]);

  // ── Expiring Posts Clean Up ─────────────────────────────────────────────────

  const handleExecuteCleanUp = useCallback(async (staleList: HubPostWithAuthor[]): Promise<void> => {
    if (!profile?.id || staleList.length === 0) return;

    const staleIds = staleList.map((p) => p.id);
    setPosts((prev) => prev.filter((p) => !staleIds.includes(p.id)));
    setExpiringPosts([]);
    setShowExpiringBanner(false);

    const success = await deleteMultiplePosts(staleIds, profile.id);
    if (success) {
      Alert.alert(
        'Cleaned Up!',
        staleList.length === 1
          ? 'Your older post was deleted. Thank you for keeping the Community Hub fresh!'
          : `${staleList.length} older posts were deleted. Thank you for keeping the Community Hub fresh!`
      );
    } else {
      Alert.alert('Error', 'Failed to delete some older posts.');
      loadPosts(true);
    }
  }, [profile?.id, loadPosts]);

  const promptCleanUp = useCallback((staleList: HubPostWithAuthor[]): void => {
    if (staleList.length === 0) return;

    const count = staleList.length;
    const title = 'Clean Up Older Posts?';
    const message = count === 1
      ? `You have a community post from ${formatCommentTime(staleList[0].created_at)}:\n\n"${staleList[0].message.slice(0, 75)}${staleList[0].message.length > 75 ? '...' : ''}"\n\nWould it be alright to delete it to keep information in the Community Hub fresh and relevant?`
      : `You have ${count} community posts approaching or past 1 week old.\n\nWould it be alright to delete them to keep information in the Community Hub fresh and relevant for other commuters?`;

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Keep for Now',
          style: 'cancel',
          onPress: async () => {
            if (profile?.id) {
              await AsyncStorage.setItem(`@hub_stale_prompt_${profile.id}`, Date.now().toString());
            }
          },
        },
        {
          text: count === 1 ? 'Delete Post' : 'Delete Posts',
          style: 'destructive',
          onPress: () => handleExecuteCleanUp(staleList),
        },
      ]
    );
  }, [profile?.id, handleExecuteCleanUp]);

  const checkExpiringPosts = useCallback(async (): Promise<void> => {
    if (!profile?.id) return;
    try {
      const stale = await getUserExpiringPosts(profile.id, 6);
      setExpiringPosts(stale);

      if (stale.length === 0) return;

      const storageKey = `@hub_stale_prompt_${profile.id}`;
      const lastPromptStr = await AsyncStorage.getItem(storageKey);
      if (lastPromptStr) {
        const lastPromptTime = parseInt(lastPromptStr, 10);
        if (Date.now() - lastPromptTime < 24 * 60 * 60 * 1000) {
          return;
        }
      }

      promptCleanUp(stale);
    } catch (err) {
      console.warn('Failed to check expiring hub posts:', err);
    }
  }, [profile?.id, promptCleanUp]);

  useEffect(() => {
    if (mention) {
      setNewPostMessage(`${mention} `);
      setEditingPostId(null);
      setNewPostVisible(true);
    }
  }, [mention]);

  const openComments = useCallback(async (post: HubPostWithAuthor) => {
    setActivePost(post);
    setCommentsVisible(true);
    setCommentsLoading(true);
    const data = await getComments(post.id);
    setComments(data);
    setCommentsLoading(false);
  }, []);

  // Ensure 'all' filter is active if navigating with a postId
  useEffect(() => {
    if (postId && selectedFilterTag !== 'all') {
      setSelectedFilterTag('all');
    }
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    setHighlightedPostId(postId);

    // Wait until feed is loaded and posts are present
    if (loading || posts.length === 0) return;

    if (lastScrolledPostId.current === postId) return;

    const index = posts.findIndex((p) => p.id === postId);
    if (index !== -1) {
      lastScrolledPostId.current = postId;
      // Allow FlatList to settle layout, then smoothly scroll down to the specific post
      const scrollTimer = setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.2,
          });
        } catch (err) {
          console.warn('[Community] scrollToIndex error:', err);
        }
      }, 400);

      const highlightTimer = setTimeout(() => {
        setHighlightedPostId((curr) => (curr === postId ? null : curr));
      }, 6000);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(highlightTimer);
      };
    }
  }, [postId, loading, posts]);

  useEffect(() => {
    checkExpiringPosts();
  }, [checkExpiringPosts]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('refresh_data', () => {
      loadPosts(true);
      checkExpiringPosts();
    });
    return () => sub.remove();
  }, [loadPosts, checkExpiringPosts]);

  const onRefresh = async () => {
    setRefreshing(true);
    setUnreadNewCount(0);
    await loadPosts(true);
    await checkExpiringPosts();
    setRefreshing(false);
  };

  // ── Reaction Handler ────────────────────────────────────────────────────────

  const handleReaction = async (targetPostId: string, reactionType: HubReactionType) => {
    if (!profile) return;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === targetPostId) {
          const wasSame = p.user_reaction === reactionType;
          const newReaction = wasSame ? null : reactionType;
          const newLiked = !wasSame;
          const prevCount = p.reactions_count || {};
          const updatedCount = { ...prevCount };

          if (p.user_reaction && updatedCount[p.user_reaction]) {
            updatedCount[p.user_reaction] = Math.max(0, updatedCount[p.user_reaction] - 1);
          }
          if (newReaction) {
            updatedCount[newReaction] = (updatedCount[newReaction] || 0) + 1;
          }

          const totalReactions = Object.values(updatedCount).reduce((a, b) => a + b, 0);

          return {
            ...p,
            user_reaction: newReaction,
            user_has_liked: newLiked,
            likes_count: totalReactions,
            reactions_count: updatedCount,
          };
        }
        return p;
      })
    );

    await toggleReaction(targetPostId, profile.id, reactionType);
  };

  // ── Delete Post Handler ─────────────────────────────────────────────────────

  const handleDeletePost = (targetPostId: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!profile) return;
          setPosts((prev) => prev.filter((p) => p.id !== targetPostId));
          const success = await deletePost(targetPostId, profile.id);
          if (!success) {
            loadPosts(true);
          }
        },
      },
    ]);
  };

  // ── Image Attachment Picker ─────────────────────────────────────────────────

  const handlePickImage = async () => {
    if (selectedImages.length >= 2) {
      Alert.alert('Limit Reached', 'You can attach up to 2 images per update.');
      return;
    }
    const result = await pickHubImage();
    if (result) {
      setSelectedImages((prev) => [...prev, result]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Edit & Submit Post ──────────────────────────────────────────────────────

  const handleEditClick = (post: HubPostWithAuthor) => {
    setEditingPostId(post.id);
    setNewPostMessage(post.message);
    setSelectedTag(post.status_tag);
    if (post.image_urls && Array.isArray(post.image_urls)) {
      setSelectedImages(post.image_urls.map((url) => ({ uri: url, base64: '' })));
    } else {
      setSelectedImages([]);
    }
    setNewPostVisible(true);
  };

  const closePostModal = () => {
    setNewPostVisible(false);
    setEditingPostId(null);
    setNewPostMessage('');
    setSelectedTag('other');
    setSelectedImages([]);
  };

  const confirmSubmitPost = () => {
    if (editingPostId) {
      Alert.alert('Save Changes', 'Are you sure you want to update this post?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: executeSubmitPost },
      ]);
    } else {
      executeSubmitPost();
    }
  };

  const executeSubmitPost = async () => {
    if (!profile || !activeRoute || !activeRoute.route_hash || !newPostMessage.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingPostId) {
        // Collect URLs: upload newly added photos, keep existing ones
        let finalImageUrls: string[] = [];
        if (selectedImages.length > 0) {
          for (const img of selectedImages) {
            if (img.base64) {
              const url = await uploadHubPostImage(profile.id, img.base64);
              if (url) finalImageUrls.push(url);
            } else if (img.uri) {
              finalImageUrls.push(img.uri);
            }
          }
        }

        const updatedPost = await updatePost(
          editingPostId,
          profile.id,
          selectedTag,
          newPostMessage.trim(),
          finalImageUrls
        );
        if (updatedPost) {
          setPosts((prev) =>
            prev.map((p) => {
              if (p.id === editingPostId) {
                return {
                  ...p,
                  ...updatedPost,
                  image_urls: finalImageUrls,
                  likes_count: p.likes_count,
                  comments_count: p.comments_count,
                  user_has_liked: p.user_has_liked,
                  user_reaction: p.user_reaction,
                  reactions_count: p.reactions_count,
                  recent_comments: p.recent_comments,
                };
              }
              return p;
            })
          );
        }
      } else {
        // Upload images if any
        let uploadedUrls: string[] = [];
        if (selectedImages.length > 0) {
          for (const img of selectedImages) {
            const url = await uploadHubPostImage(profile.id, img.base64);
            if (url) uploadedUrls.push(url);
          }
        }

        const post = await createPost(
          profile.id,
          activeRoute.route_hash,
          selectedTag,
          newPostMessage.trim(),
          activeRoute.origin_lat,
          activeRoute.origin_lng,
          activeRoute.origin_label.split(',')[0],
          uploadedUrls.length > 0 ? uploadedUrls : undefined
        );
        setPosts([post, ...posts]);
      }
      closePostModal();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to share update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Comments Handling ───────────────────────────────────────────────────────

  const handleSubmitComment = async () => {
    if (!profile || !activePost || !newComment.trim() || isSubmittingComment) return;

    const commentText = newComment.trim();
    setIsSubmittingComment(true);
    setNewComment('');

    try {
      const comment = await createComment(activePost.id, profile.id, commentText);
      setComments((prev) => [...prev, comment]);

      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === activePost.id) {
            return { ...p, comments_count: (p.comments_count || 0) + 1 };
          }
          return p;
        })
      );
    } catch (err) {
      console.error('Error submitting comment:', err);
      setNewComment(commentText);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const hasRoute = !!activeRoute;

  // Filter tags list: 'all' plus all STATUS_CONFIG items
  const filterTags = [
    { tag: 'all', label: 'All', icon: 'apps-outline', color: theme.colors.primary },
    ...(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((key) => ({
      tag: key,
      label: STATUS_CONFIG[key].label,
      icon: STATUS_CONFIG[key].icon,
      color: STATUS_CONFIG[key].color,
    })),
  ];

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

          {/* Category Filter Chips */}
          <View style={styles.filterChipsRow}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={filterTags}
              keyExtractor={(item) => item.tag}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
              renderItem={({ item }) => {
                const isSelected = selectedFilterTag === item.tag;
                return (
                  <Pressable
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? `${item.color}18` : theme.colors.surface,
                        borderColor: isSelected ? item.color : theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedFilterTag(item.tag)}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={13}
                      color={isSelected ? item.color : theme.colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color: isSelected ? item.color : theme.colors.text,
                          fontFamily: isSelected ? 'Inter-SemiBold' : 'Inter-Regular',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>

          {/* Clean Up Older Posts Banner */}
          {expiringPosts.length > 0 && showExpiringBanner && (
            <View
              style={[
                styles.expiringBanner,
                {
                  backgroundColor: `${theme.colors.warning}14`,
                  borderColor: `${theme.colors.warning}35`,
                },
              ]}
            >
              <View style={styles.expiringBannerLeft}>
                <Ionicons name="sparkles" size={18} color={theme.colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.expiringBannerTitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold' }]}>
                    Clean Up Older Posts ({expiringPosts.length})
                  </Text>
                  <Text style={[styles.expiringBannerDesc, { color: theme.colors.textMuted, fontFamily: 'Inter-Regular' }]}>
                    You have updates past or approaching 1 week. Delete them to keep info fresh?
                  </Text>
                </View>
              </View>
              <View style={styles.expiringBannerActions}>
                <Pressable
                  onPress={() => promptCleanUp(expiringPosts)}
                  style={[styles.expiringBannerBtn, { backgroundColor: theme.colors.primary }]}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'Inter-SemiBold' }}>Clean Up</Text>
                </Pressable>
                <Pressable onPress={() => setShowExpiringBanner(false)} hitSlop={8} style={{ padding: 4 }}>
                  <Ionicons name="close" size={16} color={theme.colors.textMuted} />
                </Pressable>
              </View>
            </View>
          )}

          {/* Unread New Posts Floating Pill */}
          {unreadNewCount > 0 && (
            <Pressable
              style={[styles.unreadBadge, { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                setUnreadNewCount(0);
                loadPosts(true);
              }}
            >
              <Ionicons name="arrow-up" size={14} color="#FFFFFF" />
              <Text style={styles.unreadBadgeText}>
                {unreadNewCount} new {unreadNewCount === 1 ? 'update' : 'updates'}
              </Text>
            </Pressable>
          )}

          {/* Feed List (FlatList) */}
          <FlatList
            ref={flatListRef}
            data={posts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.feedContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            }
            onScroll={(e) => {
              isScrolledDown.current = e.nativeEvent.contentOffset.y > 100;
            }}
            scrollEventThrottle={100}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewPosition: 0.2,
                });
              }, 250);
            }}
            ListEmptyComponent={
              loading ? (
                <View style={{ gap: 14 }}>
                  {[1, 2, 3].map((i) => (
                    <HubPostSkeleton key={i} />
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon="chatbubble-outline"
                  title={selectedFilterTag !== 'all' ? 'No matching updates' : 'No posts yet'}
                  message={
                    selectedFilterTag !== 'all'
                      ? 'Try clearing your category filter.'
                      : 'Be the first to post an update on this route!'
                  }
                />
              )
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <HubPostCard
                post={item}
                isHighlighted={item.id === highlightedPostId}
                currentUserId={profile?.id}
                onReaction={handleReaction}
                onReport={(pId) => {
                  setReportingPostId(pId);
                  setReportModalVisible(true);
                }}
                onImagePress={(images, index) => {
                  setViewerImages(images);
                  setViewerIndex(index);
                  setViewerVisible(true);
                }}
                onCommentClick={(p) => {
                  setActivePost(p);
                  setCommentsVisible(true);
                  openComments(p);
                }}
                onDelete={handleDeletePost}
                onEditClick={handleEditClick}
                onAvatarPress={(userId) => {
                  setSelectedProfileId(userId);
                  setProfileModalVisible(true);
                }}
              />
            )}
          />

          {/* New Post FAB */}
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
                  Alert.alert('Route Required', 'Please set a commute route first to post to its community.');
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
                    backgroundColor: newPostMessage.trim() ? theme.colors.primary : `${theme.colors.primary}20`,
                  },
                ]}
              >
                <Text
                  style={{
                    color: newPostMessage.trim() ? theme.colors.white : theme.colors.textMuted,
                    fontFamily: 'Inter-SemiBold',
                    fontSize: 13,
                  }}
                >
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
                      {activeRoute.origin_label.split(',')[0]} → {activeRoute.destination_label.split(',')[0]}
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
                      },
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
                        fontFamily: isSelected ? 'Inter-SemiBold' : 'Inter-Regular',
                      }}
                    >
                      {config.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Content Input Area */}
            <View style={{ flex: 1, marginTop: 4 }}>
              <TextInput
                style={[styles.postInput, { color: theme.colors.text }]}
                placeholder="What's happening on your route? (Roadworks, delays, floods...)"
                placeholderTextColor={theme.colors.textMuted}
                multiline
                maxLength={280}
                value={newPostMessage}
                onChangeText={setNewPostMessage}
              />

              {/* Attached Images Previews */}
              {selectedImages.length > 0 && (
                <View style={styles.imagePreviewRow}>
                  {selectedImages.map((img, i) => (
                    <View key={i} style={[styles.previewThumbWrapper, { borderColor: theme.colors.border }]}>
                      <Image source={{ uri: img.uri }} style={styles.previewThumb} />
                      <Pressable
                        style={styles.removeImageBtn}
                        onPress={() => handleRemoveImage(i)}
                        hitSlop={6}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.inputFooter}>
                {/* Photo Attachment Button */}
                <Pressable
                  style={[
                    styles.attachBtn,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: selectedImages.length >= 2 ? `${theme.colors.border}40` : theme.colors.surface,
                    },
                  ]}
                  onPress={handlePickImage}
                  disabled={selectedImages.length >= 2}
                >
                  <Ionicons name="camera-outline" size={16} color={theme.colors.primary} />
                  <Text style={[styles.attachBtnText, { color: theme.colors.primary }]}>
                    {selectedImages.length === 0 ? 'Add Photo' : `${selectedImages.length}/2 Photos`}
                  </Text>
                </Pressable>

                <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontFamily: 'Inter-Regular' }}>
                  {280 - newPostMessage.length} left
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
                <Text style={[theme.typography.subtitle, { color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 17 }]}>
                  Comments
                </Text>
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

            <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
              {commentsLoading ? (
                <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
              ) : comments.length === 0 ? (
                <View style={styles.emptyCommentsContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color={`${theme.colors.primary}40`} />
                  <Text style={{ color: theme.colors.text, fontFamily: 'Inter-SemiBold', fontSize: 15, marginTop: 12 }}>
                    No comments yet
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                    Be the first to share your thoughts!
                  </Text>
                </View>
              ) : (
                comments.map((c) => (
                  <View key={c.id} style={[styles.commentItem, { borderBottomColor: `${theme.colors.border}40` }]}>
                    <Pressable
                      onPress={() => {
                        if (c.author_id) {
                          setSelectedProfileId(c.author_id);
                          setProfileModalVisible(true);
                        }
                      }}
                    >
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
                    backgroundColor: newComment.trim() && !isSubmittingComment ? theme.colors.primary : `${theme.colors.primary}20`,
                  },
                ]}
                onPress={handleSubmitComment}
                disabled={!newComment.trim() || isSubmittingComment}
              >
                {isSubmittingComment ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Ionicons name="send" size={13} color={newComment.trim() && !isSubmittingComment ? theme.colors.white : theme.colors.textMuted} />
                )}
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
        onMention={(handle) => {
          setSelectedProfileId(null);
          setProfileModalVisible(false);
          setNewPostMessage(`${handle} `);
          setEditingPostId(null);
          setNewPostVisible(true);
        }}
      />

      {/* Fullscreen Image Viewer Modal */}
      <ImageViewerModal
        visible={viewerVisible}
        images={viewerImages}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />

      {/* Report Post Modal */}
      <ReportPostModal
        visible={reportModalVisible}
        postId={reportingPostId}
        currentUserId={profile?.id || null}
        onClose={() => setReportModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  routeBanner: { marginHorizontal: 20, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  routeBannerRoute: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeBannerDots: { alignItems: 'center', width: 10 },
  routeBannerDotGreen: { width: 8, height: 8, borderRadius: 4 },
  routeBannerLine: { width: 1.5, height: 10, marginVertical: 1 },
  routeBannerDotRed: { width: 8, height: 8, borderRadius: 4 },
  routeBannerLabels: { flex: 1, gap: 4 },
  routeBannerMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(13, 148, 136, 0.15)' },

  // Filter Chips
  filterChipsRow: {
    marginBottom: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },

  unreadBadge: {
    position: 'absolute',
    top: 140,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },

  expiringBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expiringBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  expiringBannerTitle: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  expiringBannerDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  expiringBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  expiringBannerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  feedContent: { paddingHorizontal: 20, paddingBottom: 100 },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter-SemiBold', fontSize: 14 },
  fabContainer: { position: 'absolute', right: 20, bottom: 88, overflow: 'hidden' },
  fabInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 10 },
  postButton: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  authorBadgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  routeBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 2, backgroundColor: 'rgba(13, 148, 136, 0.08)', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  postInput: { flex: 1, textAlignVertical: 'top', fontSize: 15, padding: 4, minHeight: 100 },
  imagePreviewRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  previewThumbWrapper: {
    width: 68,
    height: 68,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  previewThumb: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  attachBtnText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },

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
