// components/FavoriteCard.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

export default function FavoriteCard({ place, onPress, onDelete }) {
  return (
    <View style={styles.card}>
      {/* Infos texte */}
      <View style={styles.infoArea}>
        <Text style={styles.name} numberOfLines={1}>
          {place.name || "Lieu"}
        </Text>
        {place.address ? (
          <Text style={styles.address} numberOfLines={2}>
            {place.address}
          </Text>
        ) : null}
        {place.type ? (
          <Text style={styles.type}>
            {place.type === "bike_parking" ? "Parking vélo" : "Location vélo"}
          </Text>
        ) : null}
      </View>

      {/* Bouton "Voir" → ouvre sur la carte */}
      <TouchableOpacity
        onPress={onPress}
        style={[styles.iconBtn, { backgroundColor: "#007AFF" }]}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <FontAwesome name="map-marker" size={18} color="#fff" />
      </TouchableOpacity>

      {/* Bouton supprimer */}
      <TouchableOpacity
        onPress={() => onDelete?.(place.id)}
        style={[styles.iconBtn, { backgroundColor: "#D00" }]}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <FontAwesome name="trash" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoArea: { flex: 1, paddingRight: 10 },
  name: { fontWeight: "700", fontSize: 16, color: "#111" },
  address: { color: "#555", marginTop: 2, fontSize: 14 },
  type: { color: "#888", marginTop: 4, fontSize: 13 },
  iconBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginLeft: 6,
  },
});
