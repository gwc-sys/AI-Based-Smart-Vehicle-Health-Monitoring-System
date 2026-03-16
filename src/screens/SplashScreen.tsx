import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const loaderProgress = useSharedValue(0);

  useEffect(() => {
    // Fade In
    opacity.value = withTiming(1, { duration: 1000 });

    // Pulse Animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Loader animation (0 → 1)
    loaderProgress.value = withTiming(
      1,
      { duration: 3000, easing: Easing.linear }
    );

    return () => {
      cancelAnimation(scale);
      cancelAnimation(loaderProgress);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedCarStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedLoaderStyle = useAnimatedStyle(() => ({
    width: loaderProgress.value * (width * 0.6), // ✅ numeric width
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.glowOrb, styles.glowOrb1]} />
      <View style={[styles.glowOrb, styles.glowOrb2]} />

      <Animated.View style={[styles.content, animatedCarStyle]}>
        <Image
          source={require('../../assets/images/VHMS1.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>
          AUTOSCAN <Text style={styles.aiText}>AI</Text>
        </Text>

        <Text style={styles.subtitle}>INITIALIZING DIAGNOSTICS...</Text>

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>AI network ▰▰▰▰▰▰▰▰▰▰ 98%</Text>
          <Text style={styles.statusText}>Sensor fusion ▰▰▰▰▰▰▰▰▰▰ 87%</Text>
        </View>
      </Animated.View>

      {/* Loader */}
      <View style={styles.loaderContainer}>
        <Animated.View style={[styles.loaderBar, animatedLoaderStyle]} />
      </View>

      <Text style={styles.version}>v2.1.6 · QUANTUM CORE</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050A0E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOrb: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    shadowOpacity: 0.4,
    shadowRadius: 80,
    elevation: 10,
  },
  glowOrb1: {
    top: '10%',
    right: '-10%',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    shadowColor: '#00FFFF',
  },
  glowOrb2: {
    bottom: '10%',
    left: '-10%',
    backgroundColor: 'rgba(255, 0, 255, 0.1)',
    shadowColor: '#FF00FF',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  carContainer: {
    width: width * 0.85,
    height: 200,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleImage: {
    width: '80%',
    height: 140,
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  aiText: {
    color: '#00FFFF',
  },
  subtitle: {
    color: '#718096',
    fontSize: 14,
    marginTop: 8,
    letterSpacing: 2,
  },
  statusContainer: {
    marginTop: 20,
    alignItems: 'flex-start',
    width: '80%',
  },
  statusText: {
    color: '#4A5568',
    fontSize: 12,
    marginVertical: 2,
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 80,
    width: width * 0.6,
    height: 3,
    backgroundColor: '#1A202C',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loaderBar: {
    height: '100%',
    backgroundColor: '#00FFFF',
  },
  version: {
    position: 'absolute',
    bottom: 30,
    color: '#2D3748',
    fontSize: 10,
    letterSpacing: 1,
  },
});

export default SplashScreen;
