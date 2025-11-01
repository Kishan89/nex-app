// SplashScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  StyleSheet,
  Image,
  Platform,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import * as SystemUI from 'expo-system-ui';
interface SplashScreenProps {
  onAnimationComplete: () => void;
  trigger?: 'app_open' | 'none';
}
const { width, height } = Dimensions.get('window');
const SplashScreen: React.FC<SplashScreenProps> = ({
  onAnimationComplete,
  trigger = 'app_open',
}) => {
  const { colors, isDark } = useTheme();
  const [isInitialized, setIsInitialized] = useState(false);
  // Set system UI colors based on theme
  useEffect(() => {
    const setupSystemUI = async () => {
      try {
        // Set navigation bar color for Android
        await SystemUI.setBackgroundColorAsync(colors.background);
      } catch (error) {
        }
    };
    setupSystemUI();
  }, [colors.background, isDark]);
  // base speed multiplier - tweak to make the total ~1.6 - 2.0s
  const speed = 1;
  // MAIN animated values (useNativeDriver where supported)
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  // subtler effects
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(-1)).current; // -1 .. 1
  const backgroundPulse = useRef(new Animated.Value(1)).current;
  // particles: reduced count & simpler to keep performance good
  const particles = useRef(
    Array.from({ length: 6 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;
  // loading dots (small pulse)
  const dots = useRef([new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)]).current;
  // safe refs to stop loops on unmount
  const loopsRef = useRef<Animated.CompositeAnimation[]>([]);
  useEffect(() => {
    // mark ready to start animations (allow any asset preloads to finish before animation)
    setIsInitialized(true);
  }, []);
  useEffect(() => {
    if (!isInitialized) return;
    if (trigger === 'none') {
      // If caller doesn't want animation, immediately complete
      onAnimationComplete();
      return;
    }
    let mounted = true;
    loopsRef.current = [];
    // PARTICLE ANIMATIONS (lightweight)
    const startParticles = () => {
      particles.forEach((p, i) => {
        const dx = (Math.random() - 0.5) * (width * 0.25);
        const dy = (Math.random() - 0.5) * (height * 0.15);
        const delay = i * 120;
        const seq = Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(p.opacity, {
              toValue: 0.6,
              duration: 400,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(p.scale, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
              easing: Easing.out(Easing.quad),
            }),
            Animated.timing(p.x, {
              toValue: dx,
              duration: 1400,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(p.y, {
              toValue: dy,
              duration: 1400,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
          ]),
          Animated.parallel([
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(p.scale, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(p.x, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(p.y, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(200),
        ]);
        const looped = Animated.loop(seq);
        loopsRef.current.push(looped);
        looped.start();
      });
    };
    // background gentle pulse
    const startBackgroundPulse = () => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(backgroundPulse, {
            toValue: 1.03,
            duration: 1600 * speed,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }),
          Animated.timing(backgroundPulse, {
            toValue: 1,
            duration: 1600 * speed,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }),
        ])
      );
      loopsRef.current.push(loop);
      loop.start();
    };
    // logo glow pulse
    const startGlow = () => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 1200 * speed,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }),
          Animated.timing(glow, {
            toValue: 0,
            duration: 1200 * speed,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }),
        ])
      );
      loopsRef.current.push(loop);
      loop.start();
    };
    // shimmer sweep (single continuous timing)
    const startShimmer = () => {
      const loop = Animated.loop(
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 2000 * speed,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      );
      loopsRef.current.push(loop);
      shimmer.setValue(-1);
      loop.start();
    };
    // dot pulsing
    const startDots = () => {
      dots.forEach((d, idx) => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.delay(idx * 160),
            Animated.timing(d, {
              toValue: 1.5,
              duration: 420 * speed,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.quad),
            }),
            Animated.timing(d, {
              toValue: 1,
              duration: 420 * speed,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.quad),
            }),
            Animated.delay(200 * speed),
          ])
        );
        loopsRef.current.push(loop);
        loop.start();
      });
    };
    // MAIN entrance & exit sequence
    const mainSequence = Animated.sequence([
      // initial entrance
      Animated.parallel([
        Animated.timing(rotate, {
          toValue: 1,
          duration: Math.round(900 * speed),
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: Math.round(900 * speed),
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: Math.round(900 * speed),
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: Math.round(900 * speed),
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]),
      // text slide in
      Animated.timing(translateY, {
        toValue: 0,
        duration: Math.round(520 * speed),
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      // hold to let user see brand -> target total ~1.6 - 2s
      Animated.delay(Math.round(520 * speed)),
      // exit: subtle scale up + fade out
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 0,
          duration: Math.round(420 * speed),
          useNativeDriver: true,
          easing: Easing.in(Easing.quad),
        }),
        Animated.timing(scale, {
          toValue: 1.08,
          duration: Math.round(420 * speed),
          useNativeDriver: true,
          easing: Easing.in(Easing.quad),
        }),
      ]),
    ]);
    // start loops & main sequence
    startParticles();
    startBackgroundPulse();
    startGlow();
    startShimmer();
    startDots();
    mainSequence.start(() => {
      if (!mounted) return;
      // stop all loops to avoid running animations after completion
      loopsRef.current.forEach((l) => {
        try {
          l.stop();
        } catch {}
      });
      // small delay to ensure fade completes on screen
      setTimeout(() => {
        if (mounted) onAnimationComplete();
      }, 50);
    });
    return () => {
      mounted = false;
      // clean up main anims
      try {
        mainSequence.stop();
      } catch {}
      // stop loops
      loopsRef.current.forEach((l) => {
        try {
          l.stop();
        } catch {}
      });
      // stop individual animated values
      [...particles.flatMap(p => [p.x, p.y, p.opacity, p.scale]), ...dots, logoScale, glow, shimmer, backgroundPulse, fade, scale, translateY, rotate].forEach(v => {
        try {
          (v as Animated.Value).stopAnimation();
        } catch {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, trigger]);
  // Interpolations
  const rotation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const shimmerTranslate = shimmer.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width * 0.7, width * 0.7],
  });
  const logoGlowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.8],
  });
  // Colors using theme context
  const bgColor = colors.background;
  const accent = colors.primary;
  const titleColor = colors.text;
  const subtitleColor = colors.textMuted;
  if (!isInitialized) {
    // Show a minimal view with neutral background to prevent any flash
    const neutralBg = '#1a1a1a';
    return (
      <View style={{ flex: 1, backgroundColor: neutralBg }}>
        <StatusBar 
          style="light" 
          backgroundColor={neutralBg} 
          translucent={false}
        />
      </View>
    );
  }
  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      {/* StatusBar with proper theme-aware styling */}
      <StatusBar 
        style={isDark ? "light" : "dark"} 
        backgroundColor={bgColor} 
        translucent={false}
      />
      {/* background pulse layer */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ scale: backgroundPulse }],
            opacity: 1,
          },
        ]}
      />
      {/* particles (subtle blurred circles) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {particles.map((p, i) => (
          <Animated.View
            key={`p-${i}`}
            style={[
              styles.particle,
              {
                left: width / 2 - 8,
                top: height / 2 - 8,
                opacity: p.opacity,
                transform: [
                  { translateX: p.x },
                  { translateY: p.y },
                  { scale: p.scale },
                ],
                backgroundColor: accent,
              },
            ]}
          />
        ))}
      </View>
      {/* logo area */}
      <Animated.View
        style={[
          styles.logoBlock,
          {
            opacity: fade,
            transform: [
              { scale: Animated.multiply(scale, logoScale) },
              { rotate: rotation },
            ],
          },
        ]}
      >
        {/* subtle glow behind logo */}
        <Animated.View
          style={[
            styles.logoGlow,
            {
              backgroundColor: accent,
              opacity: logoGlowOpacity,
              borderColor: accent,
              shadowColor: accent,
              ...Platform.select({
                android: { elevation: 20 },
                ios: { shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 10 } },
              }),
            },
          ]}
        />
        <View style={[styles.logoInner, { borderColor: accent }]}>
          <Image
            source={require('@/assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </Animated.View>
      {/* text block */}
      <Animated.View
        style={[
          styles.textBlock,
          {
            opacity: fade,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: titleColor }]}>NEXEED</Text>
          {/* shimmer overlay */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shimmer,
              {
                transform: [{ translateX: shimmerTranslate }],
                backgroundColor: accent,
                opacity: 0.18,
              },
            ]}
          />
        </View>
        <Text style={[styles.subtitle, { color: subtitleColor }]}>Innovate • Connect • Grow</Text>
      </Animated.View>
      {/* small loading dots (cosmetic — will fade with fade value) */}
      <Animated.View style={[styles.loadingBlock, { opacity: fade }]}>
        <View style={styles.dotsRow}>
          {dots.map((d, i) => (
            <Animated.View
              key={`dot-${i}`}
              style={[
                styles.dot,
                {
                  backgroundColor: accent,
                  transform: [{ scale: d }],
                  opacity: Animated.add(fade, -0).interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.loadingText, { color: subtitleColor }]}>Loading your experience...</Text>
      </Animated.View>
    </View>
  );
};
const SIZE = Math.min(width, height) * 0.32; // larger logo size
const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100, // Extend background beyond safe area
  },
  particle: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    opacity: 0,
    // blur on iOS only (android will ignore)
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: {},
    }),
  },
  logoBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: height * 0.08, // responsive spacing
  },
  logoGlow: {
    position: 'absolute',
    width: SIZE + 36,
    height: SIZE + 36,
    borderRadius: (SIZE + 36) / 2,
    opacity: 0.2,
  },
  logoInner: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    // Enhanced shadows for depth
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 5 }
      },
      android: {
        elevation: 18,
      },
    }),
  },
  logoImage: {
    width: SIZE * 0.7,
    height: SIZE * 0.7,
    borderRadius: (SIZE * 0.7) / 2, // perfect circle
  },
  textBlock: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: height * 0.06, // responsive spacing between logo and text
  },
  titleWrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    width: width * 0.8, // Reduced width for better logo prominence
    height: Math.min(72, height * 0.1), // responsive height
  },
  title: {
    fontSize: Math.min(42, width * 0.14), // responsive sizing
    fontWeight: '900',
    letterSpacing: 5,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System Font' : 'sans-serif-black',
  },
  shimmer: {
    position: 'absolute',
    left: -width,
    top: 0,
    width: width * 1.8,
    height: 72,
    opacity: 0.2,
  },
  subtitle: {
    fontSize: Math.min(16, width * 0.045),
    marginTop: 6,
    fontWeight: '600',
    letterSpacing: 1.2,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System Font' : 'sans-serif-medium',
  },
  loadingBlock: {
    marginTop: height * 0.04, // responsive spacing for loading section
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 8,
    elevation: 6,
  },
  loadingText: {
    fontSize: Math.min(14, width * 0.038),
    fontWeight: '500',
    letterSpacing: 0.8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System Font' : 'sans-serif',
  },
});
export default SplashScreen;
