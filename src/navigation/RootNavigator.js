import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import PassageDetailScreen from '../screens/PassageDetailScreen';
import SummaryScreen from '../screens/SummaryScreen';
import VocabQuizScreen from '../screens/VocabQuizScreen';
import WorkbookScreen from '../screens/WorkbookScreen';
import WorkbookTypeScreen from '../screens/WorkbookTypeScreen';
import VocabListScreen from '../screens/VocabListScreen';
import WorkbookVerbScreen from '../screens/WorkbookVerbScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="PassageDetail" component={PassageDetailScreen} />
      <HomeStack.Screen name="Summary" component={SummaryScreen} />
      <HomeStack.Screen name="VocabQuiz" component={VocabQuizScreen} />
      <HomeStack.Screen name="Workbook" component={WorkbookScreen} />
      <HomeStack.Screen name="WorkbookType" component={WorkbookTypeScreen} />
      <HomeStack.Screen name="VocabList" component={VocabListScreen} />
      <HomeStack.Screen name="WorkbookVerb" component={WorkbookVerbScreen} />
    </HomeStack.Navigator>
  );
}

function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            HomeTab: focused ? 'book' : 'book-outline',
            ProgressTab: focused ? 'bar-chart' : 'bar-chart-outline',
            SettingsTab: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#EEEEEE',
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: -0.2,
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: '홈' }} />
      <Tab.Screen name="ProgressTab" component={ProgressScreen} options={{ title: '진도율' }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: '설정' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  // 인증 상태 로딩 중
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  // 로그인 안 된 경우 → 로그인 화면
  if (!user) {
    return <LoginScreen />;
  }

  // 로그인 완료 → 메인 앱
  return <MainTabNavigator />;
}
