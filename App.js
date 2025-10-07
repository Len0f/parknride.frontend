import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import user from "./reducers/user";
import favorites from "./reducers/favorites";
import { FontAwesome } from "@expo/vector-icons"; // ✅ Import FontAwesome

// Screens
import ConnexionScreen from "./screens/ConnexionScreen";
import InscriptionScreen from "./screens/InscriptionScreen";
import MapScreen from "./screens/MapScreen";
import FavoriteScreen from "./screens/FavoriteScreen";
import EditScreen from "./screens/EditScreen";

const store = configureStore({
  reducer: {
    user,
    favorites,
  },
});

// Navigation
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true, // 🔹 Pas de texte sous les icônes
        tabBarActiveTintColor: "#007BFF", // 🔹 Couleur active
        tabBarInactiveTintColor: "#000", // 🔹 Couleur inactive
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 0.3,
          height: 60,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === "Map") {
            iconName = "map-marker";
          } else if (route.name === "Favorite") {
            iconName = "heart";
          } else if (route.name === "Profil") {
            iconName = "user";
          }

          return <FontAwesome name={iconName} size={26} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Favorite" component={FavoriteScreen} />
      <Tab.Screen name="Profil" component={EditScreen} />
    </Tab.Navigator>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Connexion" component={ConnexionScreen} />
          <Stack.Screen name="Inscription" component={InscriptionScreen} />
          <Stack.Screen name="TabNavigator" component={TabNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
