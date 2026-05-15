import axios from 'axios';
import { useAuthStore } from '@/lib/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, {}, { withCredentials: true });
        const newToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { email: string; username: string; password: string; displayName?: string }) =>
    api.post('/api/v1/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/v1/auth/login', data),
  logout: () => api.post('/api/v1/auth/logout'),
  getMe: () => api.get('/api/v1/auth/me'),
  refreshToken: () => api.post('/api/v1/auth/refresh'),
  forgotPassword: (email: string) => api.post('/api/v1/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/api/v1/auth/reset-password', { token, password }),
  requestOtp: (email: string) => api.post('/api/v1/auth/otp/request', { email }),
  verifyOtp: (email: string, code: string) =>
    api.post('/api/v1/auth/otp/verify', { email, code }),
};

export const userApi = {
  getByUsername: (username: string) => api.get(`/api/v1/users/${username}`),
  getPosts: (username: string, params?: { limit?: number; cursor?: string }) =>
    api.get(`/api/v1/users/${username}/posts`, { params }),
  getReels: (username: string, params?: { limit?: number; cursor?: string }) =>
    api.get(`/api/v1/users/${username}/reels`, { params }),
  getStories: (username: string) => api.get(`/api/v1/users/${username}/stories`),
  getFollowers: (username: string, params?: { limit?: number; cursor?: string }) =>
    api.get(`/api/v1/users/${username}/followers`, { params }),
  getFollowing: (username: string, params?: { limit?: number; cursor?: string }) =>
    api.get(`/api/v1/users/${username}/following`, { params }),
  updateProfile: (data: any) => api.patch('/api/v1/users/profile', data),
  follow: (username: string) => api.post(`/api/v1/users/follow/${username}`),
  getSuggestions: (params?: { limit?: number }) => api.get('/api/v1/users/suggestions', { params }),
};

export const postApi = {
  getAll: (params?: { limit?: number; cursor?: string }) => api.get('/api/v1/posts', { params }),
  getFeed: (params?: { limit?: number; cursor?: string }) => api.get('/api/v1/posts/feed', { params }),
  getById: (id: string) => api.get(`/api/v1/posts/${id}`),
  create: (formData: FormData) => api.post('/api/v1/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: any) => api.patch(`/api/v1/posts/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/posts/${id}`),
  like: (id: string) => api.post(`/api/v1/posts/${id}/like`),
  getDrafts: () => api.get('/api/v1/posts/drafts'),
};

export const reelApi = {
  getAll: (params?: { limit?: number; cursor?: string }) => api.get('/api/v1/reels', { params }),
  getTrending: (params?: { limit?: number }) => api.get('/api/v1/reels/trending', { params }),
  getById: (id: string) => api.get(`/api/v1/reels/${id}`),
  create: (formData: FormData) => api.post('/api/v1/reels', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => api.delete(`/api/v1/reels/${id}`),
  like: (id: string) => api.post(`/api/v1/reels/${id}/like`),
  recordView: (id: string) => api.post(`/api/v1/reels/${id}/view`),
};

export const storyApi = {
  getFeed: () => api.get('/api/v1/stories/feed'),
  getById: (id: string) => api.get(`/api/v1/stories/${id}`),
  create: (formData: FormData) => api.post('/api/v1/stories', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => api.delete(`/api/v1/stories/${id}`),
  addReaction: (id: string, emoji: string) => api.post(`/api/v1/stories/${id}/reaction`, { emoji }),
  reply: (id: string, content: string) => api.post(`/api/v1/stories/${id}/reply`, { content }),
  getHighlights: (username: string) => api.get(`/api/v1/stories/highlights/${username}`),
};

export const commentApi = {
  getPostComments: (postId: string, params?: { limit?: number; cursor?: string }) =>
    api.get(`/api/v1/comments/post/${postId}`, { params }),
  getReelComments: (reelId: string, params?: { limit?: number; cursor?: string }) =>
    api.get(`/api/v1/comments/reel/${reelId}`, { params }),
  getReplies: (commentId: string, params?: { limit?: number; cursor?: string }) =>
    api.get(`/api/v1/comments/${commentId}/replies`, { params }),
  create: (data: { content: string; postId?: string; reelId?: string; parentId?: string }) =>
    api.post('/api/v1/comments', data),
  like: (id: string) => api.post(`/api/v1/comments/${id}/like`),
  update: (id: string, content: string) => api.patch(`/api/v1/comments/${id}`, { content }),
  delete: (id: string) => api.delete(`/api/v1/comments/${id}`),
};

export const chatApi = {
  getConversations: () => api.get('/api/v1/chat/conversations'),
  createConversation: (userId: string) => api.post('/api/v1/chat/conversations', { userId }),
  getMessages: (conversationId: string, params?: { limit?: number; cursor?: string }) =>
    api.get(`/api/v1/chat/conversations/${conversationId}/messages`, { params }),
  sendMessage: (conversationId: string, data: { content?: string; type?: string; mediaUrl?: string; replyToId?: string }) =>
    api.post(`/api/v1/chat/conversations/${conversationId}/messages`, data),
  mute: (conversationId: string) => api.post(`/api/v1/chat/conversations/${conversationId}/mute`),
  unmute: (conversationId: string) => api.post(`/api/v1/chat/conversations/${conversationId}/unmute`),
  deleteMessage: (conversationId: string, messageId: string) =>
    api.delete(`/api/v1/chat/conversations/${conversationId}/messages/${messageId}`),
};

export const notificationApi = {
  getAll: (params?: { limit?: number; cursor?: string }) => api.get('/api/v1/notifications', { params }),
  markRead: (id: string) => api.post(`/api/v1/notifications/${id}/read`),
  markAllRead: () => api.post('/api/v1/notifications/read-all'),
  getUnreadCount: () => api.get('/api/v1/notifications/unread-count'),
};

export const searchApi = {
  search: (q: string, type?: string) => api.get('/api/v1/search', { params: { q, type } }),
  getTrending: () => api.get('/api/v1/search/trending'),
  getRecent: () => api.get('/api/v1/search/recent'),
  clearRecent: () => api.delete('/api/v1/search/recent'),
  getExplore: (params?: { limit?: number; cursor?: string }) => api.get('/api/v1/search/explore', { params }),
};

export const analyticsApi = {
  getOverview: () => api.get('/api/v1/analytics/overview'),
  getPosts: () => api.get('/api/v1/analytics/posts'),
  getReels: () => api.get('/api/v1/analytics/reels'),
  getPostAnalytics: (postId: string) => api.get(`/api/v1/analytics/post/${postId}`),
  getReelAnalytics: (reelId: string) => api.get(`/api/v1/analytics/reel/${reelId}`),
  getAudience: () => api.get('/api/v1/analytics/audience'),
};

export const bookmarkApi = {
  toggle: (data: { postId?: string; reelId?: string; collectionId?: string }) =>
    api.post('/api/v1/bookmarks', data),
  getAll: (params?: { limit?: number; cursor?: string; collectionId?: string }) =>
    api.get('/api/v1/bookmarks', { params }),
  getCollections: () => api.get('/api/v1/bookmarks/collections'),
  createCollection: (data: { name: string; description?: string; isPrivate?: boolean }) =>
    api.post('/api/v1/bookmarks/collections', data),
  updateCollection: (id: string, data: any) => api.patch(`/api/v1/bookmarks/collections/${id}`, data),
  deleteCollection: (id: string) => api.delete(`/api/v1/bookmarks/collections/${id}`),
};

export const adminApi = {
  getDashboard: () => api.get('/api/v1/admin/dashboard'),
  getUsers: (params?: { limit?: number; cursor?: string; search?: string }) =>
    api.get('/api/v1/admin/users', { params }),
  updateUser: (userId: string, data: { action: string; reason?: string }) =>
    api.patch(`/api/v1/admin/users/${userId}`, data),
  getReports: (params?: { status?: string }) => api.get('/api/v1/admin/reports', { params }),
  updateReport: (reportId: string, data: { status: string; action?: string }) =>
    api.patch(`/api/v1/admin/reports/${reportId}`, data),
  createReport: (data: any) => api.post('/api/v1/admin/reports', data),
  getModerationActions: () => api.get('/api/v1/admin/moderation-actions'),
  createModerationAction: (data: { userId: string; action: string; reason: string; duration?: number }) =>
    api.post('/api/v1/admin/moderation-actions', data),
};
