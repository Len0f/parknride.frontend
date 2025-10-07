// screens/MapScreen.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Keyboard,
  FlatList,
  Modal,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView from "react-native-map-clustering";
import { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useDispatch, useSelector } from "react-redux";
import {
  isFavoriteById,
  localAddOrUpdate,
  localRemove,
} from "../reducers/favorites";
import { useRoute } from "@react-navigation/native";

/* ─────────── Config ─────────── */
const BACKEND_URL = "http://10.0.0.10:3000";

const FRANCE_REGION = {
  latitude: 46.2276,
  longitude: 2.2137,
  latitudeDelta: 8.5,
  longitudeDelta: 8.5,
};
const OVERPASS_MAIN = "https://overpass-api.de/api/interpreter";
const OVERPASS_FALLBACK = "https://overpass.kumi.systems/api/interpreter";
const ZOOM_GATE = 0.25;

const COLORS = {
  bike_parking: "#27ae60",
  bike_rental: "#1f77ff",
  me: "#fecb2d",
  searchPin: "#e74c3c",
  clusterBg: "#fff",
  clusterText: "#111",
  clusterBorder: "#111",
  focus: "#8A2BE2", // pin violet pour un favori ciblé
};

/* ─────────── Utils ─────────── */
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
function regionToBBox(r) {
  const { latitude, longitude, latitudeDelta, longitudeDelta } = r;
  return {
    south: latitude - latitudeDelta / 2,
    north: latitude + latitudeDelta / 2,
    west: longitude - longitudeDelta / 2,
    east: longitude + longitudeDelta / 2,
  };
}
const kindLabel = (k) =>
  k === "bike_parking" ? "Parking vélo" : "Location vélo";

function haversine(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* ─────────── Écran ─────────── */
export default function MapScreen() {
  const mapRef = useRef(null);
  const regionRef = useRef(FRANCE_REGION);
  const route = useRoute();

  const dispatch = useDispatch();
  const userId = useSelector((s) => s.user.value._id);

  /* ---- State ---- */
  const [hasPermission, setHasPermission] = useState(null);
  const [myCoords, setMyCoords] = useState(null);
  const [isInit, setIsInit] = useState(true);

  const [items, setItems] = useState([]); // pins OSM
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [tooZoomedOut, setTooZoomedOut] = useState(false);

  const [showBikeParking, setShowBikeParking] = useState(true);
  const [showBikeRental, setShowBikeRental] = useState(true);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchTarget, setSearchTarget] = useState(null); // halo rouge

  const [selected, setSelected] = useState(null); // fiche ouverte manuellement
  const isFav = useSelector(isFavoriteById(selected?.id ?? "__none__"));

  // Focus favori (violet)
  const [focusTarget, setFocusTarget] = useState(null); // { id, latitude, longitude, label, type }
  const [focusedId, setFocusedId] = useState(null);

  /* ---- Overpass fetcher ---- */
  const fetchOverpass = useCallback(async (region) => {
    const r = region || regionRef.current;
    if (!r) return;

    if (r.latitudeDelta > ZOOM_GATE) {
      setTooZoomedOut(true);
      setItems([]);
      setLoading(false);
      return;
    }
    setTooZoomedOut(false);

    const { south, west, north, east } = regionToBBox(r);
    const queryTxt = `
[out:json][timeout:25];
(
  node["amenity"="bicycle_parking"](${south},${west},${north},${east});
  way["amenity"="bicycle_parking"](${south},${west},${north},${east});
  node["amenity"="bicycle_rental"](${south},${west},${north},${east});
  way["amenity"="bicycle_rental"](${south},${west},${north},${east});
);
out center tags 800;`;

    const call = async (url) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(queryTxt),
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      return res.json();
    };

    try {
      let data;
      try {
        data = await call(OVERPASS_MAIN);
      } catch {
        data = await call(OVERPASS_FALLBACK);
      }

      const elements = Array.isArray(data?.elements) ? data.elements : [];
      const rows = elements
        .map((el) => {
          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          if (typeof lat !== "number" || typeof lon !== "number") return null;
          const t = el.tags || {};
          const amenity = t.amenity;
          const kind =
            amenity === "bicycle_parking"
              ? "bike_parking"
              : amenity === "bicycle_rental"
              ? "bike_rental"
              : null;
          if (!kind) return null;
          const address =
            t["addr:full"] ||
            [t["addr:housenumber"], t["addr:street"], t["addr:city"]]
              .filter(Boolean)
              .join(" ") ||
            undefined;
          return {
            id: String(el.id),
            latitude: lat,
            longitude: lon,
            kind,
            name: t.name || kindLabel(kind),
            address,
            type: kind,
          };
        })
        .filter(Boolean);

      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce du fetch pour l’auto-refresh
  const debouncedFetchOverpass = useMemo(
    () =>
      debounce((r) => {
        fetchOverpass(r).catch(() => {});
      }, 250),
    [fetchOverpass]
  );

  /* ---- Permission + centrage initial ---- */
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        const granted = status === "granted";
        setHasPermission(granted);
        if (granted) {
          const loc = await Location.getCurrentPositionAsync({});
          const r = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          };
          setMyCoords({ latitude: r.latitude, longitude: r.longitude });
          regionRef.current = r;
          mapRef.current?.animateToRegion(r, 600);
        }
      } finally {
        setIsInit(false);
      }
    })();
  }, []);

  /* ---- Arrivée depuis Favoris : centre + préparation du focus ---- */
  useEffect(() => {
    const t = route.params?.target;
    if (!t || !mapRef.current) return;

    const r = {
      latitude: t.latitude,
      longitude: t.longitude,
      latitudeDelta: 0.004,
      longitudeDelta: 0.004,
    };

    setShowBikeParking(true);
    setShowBikeRental(true);

    setFocusTarget(t);
    setFocusedId(null);
    setSearchTarget(null);

    regionRef.current = r;
    mapRef.current.animateToRegion(r, 400);
  }, [route.params?.target]);

  /* ---- Choix du pin à colorer en violet (id exact ou plus proche) ---- */
  useEffect(() => {
    if (!focusTarget || items.length === 0) return;

    const sameId = items.find((p) => String(p.id) === String(focusTarget.id));
    if (sameId) {
      setFocusedId(sameId.id);
      return;
    }

    const tgt = {
      latitude: focusTarget.latitude,
      longitude: focusTarget.longitude,
    };
    let best = null;
    let bestD = Infinity;
    for (const p of items) {
      const d = haversine(tgt, {
        latitude: p.latitude,
        longitude: p.longitude,
      });
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    if (best && bestD <= 120) setFocusedId(best.id);
    else setFocusedId(null);
  }, [items, focusTarget]);

  /* ---- Actions simples ---- */
  const centerOnFrance = () => {
    regionRef.current = FRANCE_REGION;
    mapRef.current?.animateToRegion(FRANCE_REGION, 500);
  };
  const centerOnMe = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const r = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
      setMyCoords({ latitude: r.latitude, longitude: r.longitude });
      regionRef.current = r;
      mapRef.current?.animateToRegion(r, 500);
    } catch {}
  };

  /* ---- Favoris (étoile du modal) → PUT/DELETE immédiats ---- */
  const onPressStar = async () => {
    if (!selected || !userId) return;

    try {
      if (isFav) {
        // DELETE immédiat
        const url = `${BACKEND_URL}/favorites/${encodeURIComponent(
          userId
        )}/${encodeURIComponent(selected.id)}`;
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) throw new Error("DELETE failed");
        dispatch(localRemove(selected.id)); // Optimistic local
      } else {
        // Enrichir l’adresse si absente
        let enriched = selected;
        if (!selected.address) {
          try {
            const parts = await Location.reverseGeocodeAsync({
              latitude: selected.latitude,
              longitude: selected.longitude,
            });
            const a = parts?.[0];
            const pretty = [a?.name, a?.street, a?.postalCode, a?.city]
              .filter(Boolean)
              .join(", ");
            if (pretty) enriched = { ...selected, address: pretty };
          } catch {}
        }
        // PUT immédiat
        const res = await fetch(
          `${BACKEND_URL}/favorites/${encodeURIComponent(
            userId
          )}/${encodeURIComponent(enriched.id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: enriched.name,
              latitude: enriched.latitude,
              longitude: enriched.longitude,
              address: enriched.address,
              type: enriched.type,
            }),
          }
        );
        if (!res.ok) throw new Error("PUT failed");
        dispatch(localAddOrUpdate(enriched)); // Optimistic local
      }
    } catch (e) {
      console.log("star toggle error:", e);
      Alert.alert("Action impossible", "Réessaie plus tard.");
    }
  };

  /* ---- Recherche/UX divers ---- */
  const searchHere = async () => {
    setErr(null);
    setLoading(true);
    await fetchOverpass(regionRef.current).catch(() =>
      setErr("Chargement impossible. Zoomez ou réduisez la zone.")
    );
  };

  const filteredItems = useMemo(
    () =>
      items.filter((p) => {
        if (p.kind === "bike_parking" && !showBikeParking) return false;
        if (p.kind === "bike_rental" && !showBikeRental) return false;
        return true;
      }),
    [items, showBikeParking, showBikeRental]
  );

  const pinColor = (k, isFocused) => {
    if (isFocused) return COLORS.focus; // violet
    return k === "bike_parking" ? COLORS.bike_parking : COLORS.bike_rental;
  };

  const renderCluster = useCallback((cluster) => {
    const { geometry, properties, onPress } = cluster;
    const count = properties.point_count;
    const id =
      properties.cluster_id ??
      properties.id ??
      `${geometry.coordinates.join(",")}-${count}`;
    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{
          latitude: geometry.coordinates[1],
          longitude: geometry.coordinates[0],
        }}
        onPress={onPress}
        tracksViewChanges={false}
      >
        <View style={styles.clusterBubble}>
          <Text style={styles.clusterCount}>{count}</Text>
        </View>
      </Marker>
    );
  }, []);

  const openSheet = (p) => setSelected(p);
  const closeSheet = () => setSelected(null);

  const fetchSuggestions = useCallback(async (text) => {
    const q = (text || "").trim();
    if (!q) return setSuggestions([]);
    try {
      const url =
        "https://photon.komoot.io/api/?q=" +
        encodeURIComponent(q) +
        "&lang=fr&limit=6";
      const res = await fetch(url);
      const data = await res.json();
      const features = Array.isArray(data?.features) ? data.features : [];
      const sugg = features
        .map((f, idx) => {
          const c = f?.geometry?.coordinates;
          const p = f?.properties || {};
          if (!c || c.length < 2) return null;
          const label =
            p.name && p.city
              ? `${p.name}, ${p.city}`
              : p.name || p.street || p.country || null;
          if (!label) return null;
          return {
            id: String(f.id ?? idx + "-" + label),
            label,
            lat: c[1],
            lon: c[0],
          };
        })
        .filter(Boolean);
      setSuggestions(sugg);
    } catch {}
  }, []);
  const debouncedSuggest = useMemo(
    () => debounce(fetchSuggestions, 300),
    [fetchSuggestions]
  );
  const onChangeQuery = (text) => {
    setQuery(text);
    debouncedSuggest(text);
  };

  const searchByText = async () => {
    const q = (query || "").trim();
    if (!q) return;
    try {
      Keyboard.dismiss();
      const results = await Location.geocodeAsync(q);
      if (!results || results.length === 0) {
        setErr("Adresse introuvable.");
        return;
      }
      const { latitude, longitude } = results[0];
      const r = {
        latitude,
        longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
      regionRef.current = r;
      setSearchTarget({ latitude, longitude, label: q });
      mapRef.current?.animateToRegion(r, 600);
    } catch {
      setErr("Erreur de géocodage.");
    }
  };
  const chooseSuggestion = (s) => {
    Keyboard.dismiss();
    setQuery(s.label);
    setSuggestions([]);
    const r = {
      latitude: s.lat,
      longitude: s.lon,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };
    regionRef.current = r;
    setSearchTarget({ latitude: s.lat, longitude: s.lon, label: s.label });
    mapRef.current?.animateToRegion(r, 600);
  };

  /* ---- UI ---- */
  if (isInit) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Initialisation…</Text>
      </View>
    );
  }
  const showPermMsg = hasPermission === false;

  return (
    <View style={styles.container}>
      <SafeAreaView
        style={[
          styles.safeTop,
          Platform.OS === "android" && {
            paddingTop: StatusBar.currentHeight || 0,
          },
        ]}
      >
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <TextInput
              value={query}
              onChangeText={onChangeQuery}
              placeholder="Rechercher une adresse…"
              returnKeyType="search"
              onSubmitEditing={searchByText}
              style={styles.searchInput}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={searchByText}>
              <Text style={{ fontWeight: "600" }}>Rechercher</Text>
            </TouchableOpacity>
          </View>

          {suggestions.length > 0 && (
            <View style={styles.suggestBox}>
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={suggestions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => chooseSuggestion(item)}
                    style={styles.suggestItem}
                  >
                    <Text style={styles.suggestText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          <View style={styles.filtersRow}>
            <TouchableOpacity
              onPress={searchHere}
              style={[styles.btn, styles.whiteBtn, styles.searchBtn]}
            >
              <Text style={styles.blackTxt}>🔍 Parkings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowBikeParking((v) => !v)}
              style={[
                styles.chip,
                showBikeParking
                  ? {
                      backgroundColor: COLORS.bike_parking,
                      borderColor: COLORS.bike_parking,
                    }
                  : styles.chipOff,
              ]}
            >
              <View style={[styles.chipDot, { backgroundColor: "#fff" }]} />
              <Text style={styles.chipTxt}>Gratuits</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowBikeRental((v) => !v)}
              style={[
                styles.chip,
                showBikeRental
                  ? {
                      backgroundColor: COLORS.bike_rental,
                      borderColor: COLORS.bike_rental,
                    }
                  : styles.chipOff,
              ]}
            >
              <View style={[styles.chipDot, { backgroundColor: "#fff" }]} />
              <Text style={styles.chipTxt}>Locations</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={FRANCE_REGION}
        showsUserLocation={!!hasPermission}
        showsMyLocationButton={false}
        mapType="standard"
        renderCluster={renderCluster}
        animationEnabled={false}
        clusterAnimationDuration={0}
        onRegionChangeComplete={(r) => {
          regionRef.current = r;
          setErr(null);
          setLoading(true);
          debouncedFetchOverpass(r);
        }}
      >
        {myCoords && (
          <Marker
            coordinate={myCoords}
            title="Ma position"
            pinColor={COLORS.me}
          />
        )}

        {searchTarget && (
          <Marker
            coordinate={{
              latitude: searchTarget.latitude,
              longitude: searchTarget.longitude,
            }}
            tracksViewChanges={false}
            zIndex={9999}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.haloOuter}>
              <View style={styles.haloInner} />
            </View>
          </Marker>
        )}

        {filteredItems.map((p) => {
          const isFocused =
            focusTarget && focusedId && String(p.id) === String(focusedId);

          return (
            <Marker
              // 👇 on ajoute l'état de focus dans la clé pour forcer un remount
              key={`${p.id}-${p.kind}-${isFocused ? "focus" : "normal"}`}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              pinColor={pinColor(p.kind, isFocused)}
              zIndex={isFocused ? 999 : 1}
              // 👇 on laisse RN Maps rafraîchir l’icône quand c’est le pin focalisé
              tracksViewChanges={isFocused}
              onPress={() => openSheet(p)}
            />
          );
        })}

        {/* Fallback violet si aucun pin Overpass ne “matche” le favori */}
        {focusTarget && !focusedId && (
          <Marker
            coordinate={{
              latitude: focusTarget.latitude,
              longitude: focusTarget.longitude,
            }}
            title={focusTarget.label || "Favori"}
            pinColor={COLORS.focus}
            zIndex={998}
            tracksViewChanges={false}
          />
        )}
      </MapView>

      <SafeAreaView style={styles.safeBottom}>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={centerOnFrance}
            style={[styles.btn, styles.whiteBtn]}
          >
            <Text style={styles.blackTxt}>🇫🇷 France</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={centerOnMe}
            style={[styles.btn, styles.whiteBtn]}
          >
            <Text style={styles.blackTxt}>📍 Ma position</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {showPermMsg && (
        <View style={[styles.banner, { top: 180 }]}>
          <Text style={styles.bannerTxt}>
            Autorise la localisation pour te centrer automatiquement.
          </Text>
        </View>
      )}
      {tooZoomedOut && (
        <View style={[styles.banner, { top: 180 }]}>
          <Text style={styles.bannerTxt}>Zoomez pour charger les lieux.</Text>
        </View>
      )}
      {(loading || err) && (
        <View
          style={[
            styles.banner,
            { top: 180 },
            err && { backgroundColor: "#ffe6e6", borderColor: "#ffb3b3" },
          ]}
        >
          {loading ? (
            <>
              <ActivityIndicator />
              <Text style={styles.bannerTxt}>Chargement…</Text>
            </>
          ) : (
            <Text style={[styles.bannerTxt, { color: "#b00020" }]}>{err}</Text>
          )}
        </View>
      )}

      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {selected?.name || kindLabel(selected?.kind)}
            </Text>
            <Text style={styles.sheetType}>{kindLabel(selected?.kind)}</Text>
            {!!selected?.address && (
              <Text style={styles.sheetAddr}>{selected.address}</Text>
            )}

            <TouchableOpacity
              onPress={onPressStar}
              style={styles.favBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.favTxt}>
                {isFav ? "★ Favori" : "☆ Favori"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={closeSheet}
              style={styles.closeBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.closeTxt}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─────────── Styles ─────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  safeTop: { position: "absolute", left: 0, right: 0, top: 0, zIndex: 10 },
  safeBottom: { position: "absolute", left: 0, right: 0, bottom: 0 },

  searchWrap: { paddingHorizontal: 12 },
  searchBar: { flexDirection: "row", gap: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 12,
    height: 44,
  },
  searchBtn: {
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },

  suggestBox: {
    marginTop: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    maxHeight: 220,
    overflow: "hidden",
  },
  suggestItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  suggestText: { color: "#111" },

  filtersRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipOff: { backgroundColor: "#111", borderColor: "#111" },
  chipTxt: { color: "#fff", fontWeight: "600" },
  chipDot: { width: 10, height: 10, borderRadius: 5 },

  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  whiteBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd" },
  blackTxt: { color: "#111", fontWeight: "600" },

  actions: {
    padding: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },

  clusterBubble: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: COLORS.clusterBg,
    borderWidth: 2,
    borderColor: COLORS.clusterBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  clusterCount: { color: COLORS.clusterText, fontWeight: "700" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  banner: {
    position: "absolute",
    left: 12,
    right: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#eaeaea",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bannerTxt: { fontSize: 14 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "94%",
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700" },
  sheetType: { marginTop: 4, color: "#333" },
  sheetAddr: { marginTop: 4, color: "#555" },
  favBtn: { marginTop: 12, alignSelf: "flex-start" },
  favTxt: { fontSize: 18 },
  closeBtn: {
    marginTop: 12,
    alignSelf: "flex-end",
    backgroundColor: "#111",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  closeTxt: { color: "#fff", fontWeight: "600" },

  // Halo rouge du favori (recherche texte)
  haloOuter: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(231,76,60,0.2)",
    borderWidth: 2,
    borderColor: "#e74c3c",
    alignItems: "center",
    justifyContent: "center",
  },
  haloInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e74c3c",
  },
});
