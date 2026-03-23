import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Image, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const loaderProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fadeIn = Animated.timing(opacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    });

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const loader = Animated.timing(loaderProgress, {
      toValue: 1,
      duration: 3000,
      easing: Easing.linear,
      useNativeDriver: false,
    });

    fadeIn.start();
    pulse.start();
    loader.start();

    return () => {
      pulse.stop();
      fadeIn.stop();
      loader.stop();
    };
  }, [loaderProgress, opacity, scale]);

  const loaderWidth = loaderProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.6],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.glowOrb, styles.glowOrb1]} />
      <View style={[styles.glowOrb, styles.glowOrb2]} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
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
          <Text style={styles.statusText}>AI network loading 98%</Text>
          <Text style={styles.statusText}>Sensor fusion loading 87%</Text>
        </View>
      </Animated.View>

      <View style={styles.loaderContainer}>
        <Animated.View style={[styles.loaderBar, { width: loaderWidth }]} />
      </View>

      <Text style={styles.version}>v2.1.6 | QUANTUM CORE</Text>
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
