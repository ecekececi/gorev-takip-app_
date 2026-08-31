import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import {
  NavigationContainer,
  DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import { auth } from './firebaseConfig';
import { colors } from './colors';
import { getStaffByUid } from './taskStore';

import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import AdminHomeScreen from './AdminHomeScreen';
import NewTaskScreen from './NewTaskScreen';
import CompletedTasksScreen from './CompletedTasksScreen';
import StaffHomeScreen from './StaffHomeScreen';
import QRScanScreen from './QRScanScreen';
import ResultScreen from './ResultScreen';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.backgroundAlt,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.primary,
  },
};

export default function App() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');
  const [initialParams, setInitialParams] = useState(undefined);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const rememberMe = await AsyncStorage.getItem('rememberMe');

      const unsubscribe = onAuthStateChanged(
        auth,
        async (user) => {
          // Bu kontrol yalnızca uygulama ilk açıldığında çalışsın.
          unsubscribe();

          if (!isMounted) return;

          try {
            if (user && rememberMe === 'true') {
              const staffInfo = await getStaffByUid(user.uid);

              if (staffInfo) {
                // Yönetici -> AdminHome
                // Kullanıcı -> doğrudan StaffHome
                setInitialRoute(
                  staffInfo.rol === 'admin'
                    ? 'AdminHome'
                    : 'StaffHome'
                );

                setInitialParams({
                  staffName: staffInfo.isim,
                  uid: user.uid,
                });
              } else {
                // Firestore'da kullanıcı bilgisi bulunamazsa çıkış yap.
                await signOut(auth);
                setInitialRoute('Login');
                setInitialParams(undefined);
              }
            } else if (user) {
              // Beni Hatırla seçilmemişse uygulama yeniden açıldığında
              // tekrar giriş yapması gerekir.
              await signOut(auth);
              setInitialRoute('Login');
              setInitialParams(undefined);
            } else {
              setInitialRoute('Login');
              setInitialParams(undefined);
            }
          } catch (error) {
            console.warn('Oturum kontrol hatası:', error);

            try {
              await signOut(auth);
            } catch (e) {
              // Oturum zaten kapalı olabilir.
            }

            setInitialRoute('Login');
            setInitialParams(undefined);
          } finally {
            if (isMounted) {
              setCheckingAuth(false);
            }
          }
        }
      );
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  if (checkingAuth) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
        />

        <Stack.Screen
          name="AdminHome"
          component={AdminHomeScreen}
          initialParams={
            initialRoute === 'AdminHome'
              ? initialParams
              : undefined
          }
        />

        <Stack.Screen
          name="NewTask"
          component={NewTaskScreen}
        />

        <Stack.Screen
          name="CompletedTasks"
          component={CompletedTasksScreen}
        />

        <Stack.Screen
          name="StaffHome"
          component={StaffHomeScreen}
          initialParams={
            initialRoute === 'StaffHome'
              ? initialParams
              : undefined
          }
        />

        <Stack.Screen
          name="QRScan"
          component={QRScanScreen}
        />

        <Stack.Screen
          name="Result"
          component={ResultScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}