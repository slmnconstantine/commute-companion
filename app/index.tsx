import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import AnimatedSplashScreen from '@/components/common/AnimatedSplashScreen';

export default function Index() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkOnboarding = async () => {
      try {
        const val1 = await AsyncStorage.getItem('@onboarding_complete');
        if (val1 === 'true') {
          if (isMounted) setHasCompletedOnboarding(true);
          return;
        }
        const val2 = await AsyncStorage.getItem('hasCompletedOnboarding');
        if (isMounted) setHasCompletedOnboarding(val2 === 'true');
      } catch {
        if (isMounted) setHasCompletedOnboarding(false);
      }
    };

    checkOnboarding();
    return () => {
      isMounted = false;
    };
  }, []);

  const isReady = !isLoading && hasCompletedOnboarding !== null;

  const handleFinish = () => {
    if (session) {
      router.replace('/(main)/(tabs)');
    } else if (hasCompletedOnboarding === false) {
      router.replace('/(auth)/onboarding');
    } else {
      router.replace('/(auth)/welcome');
    }
  };

  return (
    <AnimatedSplashScreen
      isReady={isReady}
      minDurationMs={1200}
      onFinish={handleFinish}
    />
  );
}
