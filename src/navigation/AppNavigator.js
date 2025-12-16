import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

import HomeScreen from '../screens/HomeScreen';
import RecordScreen from '../screens/RecordScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Record"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: 'tomato',
          tabBarInactiveTintColor: 'gray',
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Home') {
              iconName = focused ? 'time' : 'time-outline';
            } else if (route.name === 'Record') {
              iconName = focused ? 'radio-button-on' : 'radio-button-off';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Historique" }} />
        <Tab.Screen name="Record" component={RecordScreen} options={{ title: "Enregistrer" }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profil" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}