import AsyncStorage from "@react-native-async-storage/async-storage";
import 'react-native-url-polyfill/auto';
const IP_ADDRESS = "10.74.90.74";
const PORT = "3001";
const API_CONFIG = {
    BASE_URL: `http://${IP_ADDRESS}:${PORT}/api`,
    TIMEOUT: 30000,
};
const API_ENDPOINTS = {
    HEALTH: "/health",
    POSTS: "/posts",
    UPLOAD: "/upload",
    LOGIN: "/users/login",
    REGISTER: "/users/register",
    GOOGLE_LOGIN: "/auth/google/mobile", 
    USER_PROFILE: (userId: string) => `/users/${userId}/profile`,
    AUTHENTICATED_USER_PROFILE: "/users/me/profile",
    USER_NOTIFICATIONS: (userId: string) => `/notifications/${userId}`,
    USER_CHATS: (userId: string) => `/chats/${userId}`,
    CHAT_MESSAGES: (chatId: string) => `/chats/${chatId}/messages`,
    SEND_MESSAGE: (chatId: string) => `/chats/${chatId}/messages`,
    POST_COMMENTS: (postId: string) => `/posts/${postId}/comments`,
    POST_BY_ID: (postId: string) => `/posts/${postId}`,
    USER_BOOKMARKS: (userId: string) => `/users/${userId}/bookmarks`,
    SEARCH_USERS: "/search/users",
    LIKE_POST: (postId: string) => `/posts/${postId}/like`,
    UNLIKE_POST: (postId: string) => `/posts/${postId}/like`,
    BOOKMARK_POST: (postId: string) => `/posts/${postId}/bookmark`,
    UNBOOKMARK_POST: (postId: string) => `/posts/${postId}/unbookmark`,
    REGISTER_PUSH_TOKEN: "/push-tokens",
};
const API_ERRORS = {
    TIMEOUT_ERROR: "Request timed out. Please try again.",
    NETWORK_ERROR: "Network request failed. Please check your connection.",
};
type CreatePostData = { content: string; userId: string; imageUrl?: string; };
type RegisterData = { username: string; email: string; password: string; };
type LoginData = { email: string; password: string; };
type MessageData = { chatId: string; senderId: string; content: string; };
export type ProfileData = {
    id: string; username: string; email: string; bio?: string; avatar_url?: string;
    banner_url?: string; xp?: number; posts_count?: number; followers_count?: number;
    following_count?: number;
};
type Post = any;
type Comment = any;
type Chat = any;
type Message = any;
type Notification = any;
type AuthResponse = { token?: string; user?: any; message?: string; };
type SuccessResponse<T = any> = { success: true; message: string; data: T; };
export type UserSearchResult = { id: string; username: string; bio: string; avatar_url: string; };
const AUTH_TOKEN_KEY = "authToken";
class ApiService {
    private baseURL: string;
    private timeout: number;
    private authToken: string | null = null;
    public userId: string | null = null;
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
    }
    async loadAuthTokenFromStorage(): Promise<void> {
        try {
            const t = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
            if (t) {
                this.authToken = t;
                try {
                    const payload = JSON.parse(atob(t.split('.')[1]));
                    this.userId = payload.userId || payload.sub || payload.id;
                    } catch (e) {
                    this.authToken = null;
                    this.userId = null;
                }
            } else {
                }
        } catch (e) {
            }
    }
    async setAuthToken(token: string): Promise<void> {
        this.authToken = token;
        try {
            await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
            const payload = JSON.parse(atob(token.split('.')[1]));
            this.userId = payload.userId;
            } catch (e) {
            }
    }
    async clearAuthToken(): Promise<void> {
        this.authToken = null;
        this.userId = null;
        try {
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            } catch (e) {
            }
    }
    private async _request<T>(
        method: "GET" | "POST" | "PUT" | "DELETE",
        endpoint: string,
        data?: any,
        extraHeaders?: Record<string, string>
    ): Promise<T> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        const url = `${this.baseURL}${endpoint}`;
        try {
            const isFormData = data instanceof FormData;
            const headers: Record<string, string> = {
                ...(isFormData ? {} : { "Content-Type": "application/json" }),
                ...(extraHeaders || {}),
            };
            if (this.authToken) headers.Authorization = `Bearer ${this.authToken}`;
            const body = isFormData ? data : data ? JSON.stringify(data) : undefined;
            const response = await fetch(url, { method, headers, body, signal: controller.signal });
            clearTimeout(timeoutId);
            const parsed = await response.text().then((text) => {
                try { return JSON.parse(text); } catch { return text; }
            });
            if (!response.ok) {
                const serverMsg = parsed?.error || parsed?.message || parsed;
                throw new Error(`HTTP ${response.status} — ${serverMsg}`);
            }
            return parsed as T;
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err?.name === "AbortError") throw new Error(err?.message || API_ERRORS.NETWORK_ERROR);
        }
    }
    private get<T>(endpoint: string) { return this._request<T>("GET", endpoint); }
    private post<T>(endpoint: string, data?: any) { return this._request<T>("POST", endpoint, data); }
    private put<T>(endpoint: string, data?: any) { return this._request<T>("PUT", endpoint, data); }
    private delete<T>(endpoint: string) { return this._request<T>("DELETE", endpoint); }
    healthCheck() { return this.get<{ status: string; message?: string }>(API_ENDPOINTS.HEALTH); }
    // Authentication methods
    login(credentials: LoginData) { 
        return this.post<AuthResponse>(API_ENDPOINTS.LOGIN, credentials); 
    }
    register(userData: RegisterData) { 
        return this.post<AuthResponse>(API_ENDPOINTS.REGISTER, userData); 
    }
    googleLoginBackend(idToken: string) { 
        return this.post<AuthResponse>(API_ENDPOINTS.GOOGLE_LOGIN, { idToken }); 
    }
    async getPosts(): Promise<any[]> {
        try {
            const posts = await this.get<any[]>(API_ENDPOINTS.POSTS);
            return Array.isArray(posts) ? posts : [];
        } catch (error) {
            return [];
        }
    }
    async getPostById(postId: string): Promise<any | null> {
        try {
            const post = await this.get<any>(API_ENDPOINTS.POST_BY_ID(postId));
            return post;
        } catch (error) {
            return null;
        }
    }
    getPostsByUser(userId: string) { return this.get<Post[]>(`${API_ENDPOINTS.POSTS}?userId=${userId}`); }
    getUserProfile(userId: string) { return this.get<ProfileData>(API_ENDPOINTS.USER_PROFILE(userId)); }
    getAuthenticatedUserProfile() { return this.get<ProfileData>(API_ENDPOINTS.AUTHENTICATED_USER_PROFILE); }
    updateUserProfile(userId: string, data: Partial<ProfileData>) { return this.put<{ message: string; user: ProfileData }>(API_ENDPOINTS.USER_PROFILE(userId), data); }
    createPost(postData: CreatePostData) {
        const { userId, ...payload } = postData;
        return this.post<Post>(API_ENDPOINTS.POSTS, payload);
    }
    async getPostComments(postId: string): Promise<any[]> {
        const response = await this.get<any>(API_ENDPOINTS.POST_COMMENTS(postId));
        if (response && response.data && Array.isArray(response.data)) {
            return response.data;
        }
        if (Array.isArray(response)) {
            return response;
        }
        return [];
    }
    async addComment(postId: string, text: string) {
        return this.post<Comment>(
            API_ENDPOINTS.POST_COMMENTS(postId),
            { text }
        );
    }
    getUserChats(userId: string) { return this.get<Chat[]>(API_ENDPOINTS.USER_CHATS(userId)); }
    getChatMessages(chatId: string) { return this.get<Message[]>(API_ENDPOINTS.CHAT_MESSAGES(chatId)); }
    sendMessage(chatId: string, messageData: MessageData) { return this.post<Message>(API_ENDPOINTS.SEND_MESSAGE(chatId), messageData); }
    getUserNotifications(userId: string) {
        const endpoint = API_ENDPOINTS.USER_NOTIFICATIONS(userId);
        return this._request<Notification[]>("GET", endpoint)
            .then(notifications => {
                return Array.isArray(notifications) ? notifications : [];
            })
            .catch(error => {
                return [];
            });
    }
    async uploadImageFile(uri: string, fieldName = "file") {
        if (!uri) throw new Error("No file URI provided for upload");
        const form = new FormData();
        const filename = uri.split("/").pop() || `upload.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : "jpg";
        const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
        // @ts-ignore
        form.append(fieldName, { uri, name: filename, type: mime });
        const uploadResponse = await this.post<{ url: string }>(API_ENDPOINTS.UPLOAD, form);
        const returnedUrl = uploadResponse?.url || "";
        const fullUrl = /^https?:\/\//i.test(returnedUrl) ? returnedUrl : `http://${IP_ADDRESS}:${PORT}${returnedUrl.startsWith("/") ? "" : "/"}${returnedUrl}`;
        return { url: fullUrl };
    }
    getBookmarks(userId: string) { return this.get<Post[]>(API_ENDPOINTS.USER_BOOKMARKS(userId)); }
    searchUsers(query: string) { return this.get<{ users: UserSearchResult[] }>(`${API_ENDPOINTS.SEARCH_USERS}?q=${encodeURIComponent(query)}`); }
    async toggleLikePost(postId: string): Promise<SuccessResponse<{ liked: boolean; likeCount: number }>> {
        if (!this.userId) {
            throw new Error("User ID not available. Please log in.");
        }
        return this.post<SuccessResponse<{ liked: boolean; likeCount: number }>>(API_ENDPOINTS.LIKE_POST(postId), {});
    }
    async toggleLikeAndFetchNotifications(postId: string) {
        if (!this.userId) throw new Error("User ID not available");
        const likeResponse = await this.post<SuccessResponse<{ liked: boolean; likeCount: number }>>(API_ENDPOINTS.LIKE_POST(postId), {});
        const notifications = await this.getUserNotifications(this.userId);
        return { likeResponse, notifications };
    }
    async toggleBookmark(postId: string): Promise<SuccessResponse<{ bookmarked: boolean; bookmarkCount: number }>> {
        if (!this.userId) {
            throw new Error("User ID not available. Please log in.");
        }
        return this.post<SuccessResponse<{ bookmarked: boolean; bookmarkCount: number }>>(API_ENDPOINTS.BOOKMARK_POST(postId), { userId: this.userId });
    }
    async checkIfBookmarked(postId: string): Promise<boolean> {
        if (!this.userId) {
            return false;
        }
        try {
            const bookmarks = await this.getBookmarks(this.userId);
            return bookmarks.some(bookmark => bookmark.id === postId);
        } catch (error) {
            return false;
        }
    }
    async registerPushToken(token: string): Promise<void> {
        if (!this.authToken) {
            return;
        }
        if (!token) {
            return;
        }
        try {
            const response = await this.post<{ message: string }>(
                API_ENDPOINTS.REGISTER_PUSH_TOKEN, 
                { token }
            );
            } catch (error) {
            }
    }
    async votePoll(pollId: string, optionId: string): Promise<SuccessResponse<any>> {
        if (!this.userId) {
            throw new Error("User ID not available. Please log in.");
        }
        return this.post<SuccessResponse<any>>(`/polls/${pollId}/vote`, { optionId });
    }
    // FCM Token Management
    async saveFCMToken(token: string, platform: string): Promise<SuccessResponse<null>> {
        return this.post<SuccessResponse<null>>("/fcm/token", { token, platform });
    }
    async removeFCMToken(token: string): Promise<SuccessResponse<null>> {
        return this._request<SuccessResponse<null>>("DELETE", "/fcm/token", { token });
    }
    async getFCMTokens(): Promise<any[]> {
        return this.get<any[]>("/fcm/tokens");
    }
}
export const apiService = new ApiService();
export default apiService;
