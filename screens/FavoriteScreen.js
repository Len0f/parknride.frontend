// screens/FavoriteScreen.js
import { useCallback, useState } from "react";
import {
  View,
  FlatList,
  Text,
  RefreshControl,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import FavoriteCard from "../components/FavoriteCard";
import {
  selectFavorites,
  setFavorites,
  localRemove,
} from "../reducers/favorites";
import { useFocusEffect } from "@react-navigation/native";

const BACKEND_URL = "https://parknride-backend.vercel.app";

export default function FavoriteScreen({ navigation }) {
  const dispatch = useDispatch();
  const favorites = useSelector(selectFavorites);
  const userId = useSelector((s) => s.user.value._id);
  const username = useSelector((s) => s.user.value.username) || "—";

  const [loading, setLoading] = useState(false);

  // GET favoris serveur
  const loadRemote = async () => {
    const res = await fetch(
      `${BACKEND_URL}/favorites/${encodeURIComponent(userId)}`
    );
    if (!res.ok) throw new Error("GET favorites failed");
    const data = await res.json(); // { ok, items }
    return data.items || [];
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      const items = await loadRemote();
      dispatch(setFavorites(items));
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  // Au focus: (re)charge
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      refreshAll();
    }, [userId])
  );

  // Suppression directe (DELETE immédiat)
  const onDelete = (placeId) => {
    Alert.alert("Retirer des favoris ?", "", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          // Optimistic UI
          dispatch(localRemove(placeId));
          try {
            const url = `${BACKEND_URL}/favorites/${encodeURIComponent(
              userId
            )}/${encodeURIComponent(placeId)}`;
            const res = await fetch(url, { method: "DELETE" });
            if (!res.ok) {
              const txt = await res.text().catch(() => "");
              throw new Error(`DELETE failed (${res.status}) ${txt}`);
            }
            const items = await loadRemote();
            dispatch(setFavorites(items));
          } catch (e) {
            console.log("delete error:", e);
            // Si échec serveur : on resynchronise (l'élément peut réapparaître)
            try {
              const items = await loadRemote();
              dispatch(setFavorites(items));
            } catch {}
            Alert.alert("Suppression impossible", "Réessaie plus tard.");
          }
        },
      },
    ]);
  };

  const openOnMap = (item) => {
    navigation.navigate("Map", {
      target: {
        id: item.placeId,
        latitude: item.latitude,
        longitude: item.longitude,
        label: item.name || item.address || "Favori",
        type: item.type, // "bike_parking" | "bike_rental"
      },
    });
  };

  // Écrans d’état avec en-tête cohérent
  if (!userId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Favoris de {username}</Text>
          <Text style={styles.subtitle}>
            Connecte-toi pour voir tes favoris
          </Text>
        </View>
        <View style={styles.center}>
          <Text>Connecte-toi d’abord (userId manquant).</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !favorites.length) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Favoris de {username}</Text>
          <Text style={styles.subtitle}>Chargement de tes lieux…</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Chargement…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <FlatList
        data={favorites}
        keyExtractor={(it) => String(it.placeId)}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshAll} />
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <FavoriteCard
              place={{
                id: item.placeId,
                name: item.name,
                latitude: item.latitude,
                longitude: item.longitude,
                address: item.address,
                type: item.type,
              }}
              onPress={() => openOnMap(item)}
              onDelete={(placeId) => onDelete(placeId)}
            />
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.title}>Favoris de {username}</Text>
            <Text style={styles.subtitle}>
              {favorites.length
                ? `${favorites.length} favori${favorites.length > 1 ? "s" : ""}`
                : "Aucun favori pour l’instant"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: "#666", textAlign: "center" }}>
              Ajoute un favori depuis la carte avec l’étoile.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  // ↳ Titre/sous-titre repris du style EditScreen
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
  },
  subtitle: {
    color: "#666",
    marginTop: 2,
  },

  listContent: {
    //paddingHorizontal: 16, // évite le collage aux bords
    paddingBottom: 24,
  },
  cardWrap: {
    marginVertical: 4,
  },
  empty: {
    alignItems: "center",
    padding: 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});
