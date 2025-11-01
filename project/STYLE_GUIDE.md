# Nexeed Frontend - TypeScript/React Native Style Guide

This document defines the coding standards and best practices for the Nexeed React Native frontend codebase.

## Table of Contents
1. [TypeScript Guidelines](#typescript-guidelines)
2. [Component Structure](#component-structure)
3. [Naming Conventions](#naming-conventions)
4. [File Organization](#file-organization)
5. [State Management](#state-management)
6. [Styling](#styling)
7. [Error Handling](#error-handling)
8. [Performance](#performance)
9. [Constants and Configuration](#constants-and-configuration)
10. [Comments and Documentation](#comments-and-documentation)

---

## TypeScript Guidelines

### Always Use Strong Types

```typescript
// ✅ Good - Explicit types
interface PostCardProps {
  post: NormalizedPost;
  isLiked: boolean;
  onLike: () => void;
  onComment: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, isLiked, onLike, onComment }) => {
  // Component logic
};

// ❌ Bad - Using any or missing types
const PostCard = ({ post, isLiked, onLike, onComment }: any) => {
  // Component logic
};
```

### Avoid `any` Type

```typescript
// ✅ Good - Use specific types or unknown
interface ApiResponse<T> {
  data: T;
  error?: string;
  success: boolean;
}

function handleResponse<T>(response: ApiResponse<T>): T | null {
  if (response.success) {
    return response.data;
  }
  return null;
}

// ❌ Bad - Using any
function handleResponse(response: any): any {
  if (response.success) {
    return response.data;
  }
  return null;
}
```

### Use Type Guards

```typescript
// ✅ Good - Type guards for runtime checks
function isNormalizedPost(obj: unknown): obj is NormalizedPost {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'username' in obj &&
    'content' in obj
  );
}

// Usage
if (isNormalizedPost(data)) {
  console.log(data.username); // TypeScript knows this is safe
}
```

### Strict TypeScript Configuration

Enable strict mode in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

---

## Component Structure

### Component File Structure

```typescript
// 1. Imports - grouped by category
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Heart, MessageCircle } from 'lucide-react-native';

// 2. Types/Interfaces
interface PostCardProps {
  post: NormalizedPost;
  onLike: () => void;
}

// 3. Constants (component-specific)
const MAX_CONTENT_LENGTH = 280;
const ANIMATION_DURATION = 300;

// 4. Component
const PostCard: React.FC<PostCardProps> = ({ post, onLike }) => {
  // 4a. Hooks
  const [isLiked, setIsLiked] = useState(false);
  const { colors } = useTheme();
  
  // 4b. Effects
  useEffect(() => {
    // Effect logic
  }, []);
  
  // 4c. Callbacks and handlers
  const handleLike = useCallback(() => {
    setIsLiked(!isLiked);
    onLike();
  }, [isLiked, onLike]);
  
  // 4d. Render helpers
  const renderHeader = () => (
    <View style={styles.header}>
      {/* Header content */}
    </View>
  );
  
  // 4e. Main render
  return (
    <View style={styles.container}>
      {renderHeader()}
    </View>
  );
};

// 5. Styles
const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
  },
});

// 6. Export
export default React.memo(PostCard);
```

### Functional Components Only

```typescript
// ✅ Good - Functional component with hooks
const MyComponent: React.FC<Props> = ({ title, onPress }) => {
  const [count, setCount] = useState(0);
  
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{title}: {count}</Text>
    </TouchableOpacity>
  );
};

// ❌ Bad - Class component (avoid unless absolutely necessary)
class MyComponent extends React.Component {
  state = { count: 0 };
  
  render() {
    return <Text>{this.props.title}</Text>;
  }
}
```

### Use React.memo for Performance

```typescript
// ✅ Good - Memoize components that receive same props often
const PostCard = React.memo(({ post, onLike }: PostCardProps) => {
  return <View>{/* Component content */}</View>;
});

// Custom comparison function if needed
const PostCard = React.memo(
  ({ post, onLike }: PostCardProps) => {
    return <View>{/* Component content */}</View>;
  },
  (prevProps, nextProps) => {
    return prevProps.post.id === nextProps.post.id &&
           prevProps.post.liked === nextProps.post.liked;
  }
);
```

---

## Naming Conventions

### Files and Folders

```
✅ Good:
components/
  PostCard.tsx        # PascalCase for components
  ui/
    Button.tsx
    Avatar.tsx
hooks/
  useDebounce.ts      # camelCase with 'use' prefix
  useAuth.ts
lib/
  api.ts              # camelCase for utilities
  logger.ts
types/
  index.ts            # lowercase for type definitions
constants/
  theme.ts            # lowercase
  api.ts

❌ Bad:
components/
  post-card.tsx       # Don't use kebab-case
  postCard.tsx        # Don't use camelCase for components
```

### Components

```typescript
// ✅ Good - PascalCase
const PostCard: React.FC<Props> = () => { };
const UserAvatar: React.FC<Props> = () => { };
const CommentsList: React.FC<Props> = () => { };

// ❌ Bad
const postCard = () => { };
const user_avatar = () => { };
```

### Hooks

```typescript
// ✅ Good - camelCase starting with 'use'
const useDebounce = (value: string, delay: number) => { };
const useAuth = () => { };
const useTheme = () => { };

// ❌ Bad
const debounce = () => { };  // Missing 'use' prefix
const UseAuth = () => { };   // PascalCase is wrong
```

### Variables and Functions

```typescript
// ✅ Good - camelCase
const userName = 'John';
const handleSubmit = () => { };
const fetchUserData = async () => { };

// ❌ Bad
const UserName = 'John';
const handle_submit = () => { };
const FETCH_USER_DATA = () => { };
```

### Constants

```typescript
// ✅ Good - UPPER_SNAKE_CASE for true constants
const MAX_RETRY_ATTEMPTS = 3;
const API_TIMEOUT = 5000;
const DEFAULT_PAGE_SIZE = 20;

// ✅ Good - camelCase for configuration objects
const apiConfig = {
  baseUrl: 'https://api.example.com',
  timeout: 5000,
};

// ❌ Bad
const max_retry_attempts = 3;
const apiTimeout = 5000;
```

### Types and Interfaces

```typescript
// ✅ Good - PascalCase, descriptive names
interface UserProfile {
  id: string;
  username: string;
}

type PostStatus = 'draft' | 'published' | 'archived';

interface PostCardProps {
  post: NormalizedPost;
  onLike: () => void;
}

// ❌ Bad
interface userProfile { }  // Should be PascalCase
type status = string;      // Too generic
interface Props { }        // Too generic for exported type
```

---

## File Organization

### Directory Structure

```
project/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   ├── chat/[id].tsx      # Dynamic routes
│   └── _layout.tsx        # Layout files
├── components/            # Reusable components
│   ├── ui/               # Generic UI components
│   ├── skeletons/        # Loading skeletons
│   └── PostCard.tsx      # Feature components
├── constants/            # App-wide constants
│   ├── api.ts
│   └── theme.ts
├── context/              # React Context providers
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── hooks/                # Custom hooks
│   ├── useDebounce.ts
│   └── useAuth.ts
├── lib/                  # Utilities and services
│   ├── api.ts
│   ├── logger.ts
│   └── firebase.ts
├── store/                # Zustand stores
│   ├── profileStore.ts
│   └── postCache.ts
└── types/                # TypeScript types
    └── index.ts
```

### Import Order

```typescript
// 1. React and React Native
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 2. Third-party libraries
import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';

// 3. Absolute imports from project (using @/ alias)
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/lib/api';
import { NormalizedPost } from '@/types';

// 4. Relative imports
import PostCard from './PostCard';
import { formatDate } from '../utils/date';

// 5. Styles (always last)
import styles from './styles';
```

---

## State Management

### Local State (useState)

```typescript
// ✅ Good - Use for component-specific state
const PostCard: React.FC<Props> = ({ post }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  return (/* Component JSX */);
};

// ❌ Bad - Don't use for shared state
const [user, setUser] = useState(null); // Use AuthContext instead
```

### Context API

```typescript
// ✅ Good - Use for global state
// AuthContext.tsx
interface AuthContextType {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  
  const login = useCallback(async (credentials: Credentials) => {
    // Login logic
  }, []);
  
  const logout = useCallback(() => {
    // Logout logic
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for consuming context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Zustand Stores

```typescript
// ✅ Good - Use for complex state with caching
// profileStore.ts
interface ProfileStore {
  profiles: Map<string, CachedProfile>;
  loading: Map<string, boolean>;
  getProfile: (userId: string) => Promise<CachedProfile | null>;
  updateProfile: (userId: string, updates: Partial<CachedProfile>) => Promise<void>;
}

class ProfileStoreManager implements ProfileStore {
  private store = {
    profiles: new Map<string, CachedProfile>(),
    loading: new Map<string, boolean>(),
  };
  
  async getProfile(userId: string): Promise<CachedProfile | null> {
    // Implementation
  }
  
  async updateProfile(userId: string, updates: Partial<CachedProfile>): Promise<void> {
    // Implementation
  }
}

export const profileStore = new ProfileStoreManager();
```

---

## Styling

### Use Constants from Theme

```typescript
// ✅ Good - Use theme constants
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

const PostCard: React.FC<Props> = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>Hello</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  text: {
    fontSize: FontSizes.md,
  },
});

// ❌ Bad - Magic numbers
const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
  },
  text: {
    fontSize: 16,
  },
});
```

### StyleSheet.create

```typescript
// ✅ Good - Use StyleSheet.create
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  text: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
});

// ❌ Bad - Inline styles everywhere
<View style={{ flex: 1, padding: 16 }}>
  <Text style={{ fontSize: 16, fontWeight: '500' }}>Text</Text>
</View>
```

### Dynamic Styles with Theme

```typescript
// ✅ Good - Combine static and dynamic styles
const PostCard: React.FC<Props> = () => {
  const { colors, isDark } = useTheme();
  
  return (
    <View style={[
      styles.container,
      { backgroundColor: colors.background }
    ]}>
      <Text style={[styles.text, { color: colors.text }]}>
        Content
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  text: {
    fontSize: FontSizes.md,
  },
});
```

---

## Error Handling

### Try-Catch in Async Functions

```typescript
// ✅ Good - Proper error handling
const fetchUserData = async (userId: string): Promise<User | null> => {
  try {
    const response = await apiService.getUserProfile(userId);
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      logger.error('API Error:', error.message);
      Alert.alert('Error', error.message);
    } else {
      logger.error('Unexpected error:', error);
      Alert.alert('Error', 'Something went wrong');
    }
    return null;
  }
};

// ❌ Bad - Swallowing errors
const fetchUserData = async (userId: string) => {
  try {
    const response = await apiService.getUserProfile(userId);
    return response.data;
  } catch (error) {
    // Silent failure
  }
};
```

### Error Boundaries

```typescript
// ✅ Good - Use error boundaries for React errors
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

---

## Performance

### Use useCallback for Event Handlers

```typescript
// ✅ Good - Memoize callbacks
const PostCard: React.FC<Props> = ({ post, onLike }) => {
  const handleLike = useCallback(() => {
    onLike(post.id);
  }, [post.id, onLike]);
  
  return (
    <TouchableOpacity onPress={handleLike}>
      <Text>Like</Text>
    </TouchableOpacity>
  );
};

// ❌ Bad - New function on every render
const PostCard: React.FC<Props> = ({ post, onLike }) => {
  return (
    <TouchableOpacity onPress={() => onLike(post.id)}>
      <Text>Like</Text>
    </TouchableOpacity>
  );
};
```

### Use useMemo for Expensive Computations

```typescript
// ✅ Good - Memoize expensive calculations
const PostList: React.FC<Props> = ({ posts }) => {
  const sortedPosts = useMemo(() => {
    return posts.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [posts]);
  
  return <FlatList data={sortedPosts} />;
};

// ❌ Bad - Recalculate on every render
const PostList: React.FC<Props> = ({ posts }) => {
  const sortedPosts = posts.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  return <FlatList data={sortedPosts} />;
};
```

### FlatList Optimizations

```typescript
// ✅ Good - Optimize FlatList
<FlatList
  data={posts}
  renderItem={renderPost}
  keyExtractor={(item) => item.id}
  windowSize={10}
  maxToRenderPerBatch={10}
  initialNumToRender={10}
  removeClippedSubviews={true}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>

// ❌ Bad - No optimizations
<FlatList
  data={posts}
  renderItem={(item) => <PostCard post={item.item} />}
/>
```

---

## Constants and Configuration

### Extract Magic Values

```typescript
// ✅ Good - Use constants
const MAX_CONTENT_LENGTH = 280;
const DEBOUNCE_DELAY = 300;
const ANIMATION_DURATION = 250;

const PostInput: React.FC = () => {
  const [content, setContent] = useState('');
  
  const isValid = content.length <= MAX_CONTENT_LENGTH;
  
  return (/* Component JSX */);
};

// ❌ Bad - Magic numbers
const PostInput: React.FC = () => {
  const [content, setContent] = useState('');
  
  const isValid = content.length <= 280;
  
  return (/* Component JSX */);
};
```

### Centralize Configuration

```typescript
// constants/api.ts
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

export const API_ENDPOINTS = {
  POSTS: '/api/posts',
  USERS: '/api/users',
  CHATS: '/api/chats',
};

// Usage
import { API_CONFIG, API_ENDPOINTS } from '@/constants/api';

const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.POSTS}`);
```

---

## Comments and Documentation

### JSDoc for Public APIs

```typescript
/**
 * Custom hook for debouncing a value
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced value
 * @example
 * const debouncedSearch = useDebounce(searchTerm, 300);
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};
```

### Inline Comments

```typescript
// ✅ Good - Explain WHY, not WHAT
// Prefetch data on component mount to improve perceived performance
useEffect(() => {
  prefetchData();
}, []);

// Cache user data to avoid unnecessary API calls
const cachedUser = useMemo(() => getUserFromCache(userId), [userId]);

// ❌ Bad - Obvious comments
// Set the user
setUser(newUser);

// Render the component
return <View>{children}</View>;
```

---

## Summary Checklist

Before committing code, ensure:

- [ ] TypeScript strict mode enabled
- [ ] No `any` types (use `unknown` or specific types)
- [ ] Components use React.FC with proper prop types
- [ ] Functional components only (no class components)
- [ ] Proper import order
- [ ] Use theme constants (Colors, Spacing, etc.)
- [ ] Event handlers wrapped in useCallback
- [ ] Expensive calculations wrapped in useMemo
- [ ] Error handling in async functions
- [ ] No console.log (use logger)
- [ ] Components wrapped in React.memo when appropriate
- [ ] FlatList optimizations applied
- [ ] Descriptive variable and function names
- [ ] JSDoc for exported functions/hooks
- [ ] No magic numbers or strings
