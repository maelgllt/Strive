import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Import des écrans
import HomeScreen from '../screens/HomeScreen';
import RecordScreen from '../screens/RecordScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Record"
        screenOptions={{
          headerShown: false,
          tabBarStyle: { paddingBottom: 5, height: 60 },
          tabBarLabelStyle: { fontSize: 12 }
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Historique" }} />
        <Tab.Screen name="Record" component={RecordScreen} options={{ title: "Enregistrer" }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profil" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}