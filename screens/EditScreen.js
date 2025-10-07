// screens/EditScreen.jsx
import React, { useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser, updateUser } from "../reducers/user";

// ⛽️ Remplace par ton IP
const BACKEND_URL = "https://parknride-backend.vercel.app";

import CustomInput from "../components/CustomInput";
import CustomButton from "../components/CustomButton";

const EMAIL_REGEX =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default function EditScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.user.value);

  const [edit, setEdit] = useState(false);
  const [username, setUsername] = useState(user.username ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasChanges = useMemo(
    () =>
      username.trim() !== (user.username || "") ||
      email.trim() !== (user.email || ""),
    [username, email, user.username, user.email]
  );
  const emailValid = useMemo(
    () => EMAIL_REGEX.test(String(email).trim().toLowerCase()),
    [email]
  );

  const enterEdit = () => {
    setUsername(user.username ?? "");
    setEmail(user.email ?? "");
    setEdit(true);
  };
  const cancelEdit = () => {
    setUsername(user.username ?? "");
    setEmail(user.email ?? "");
    setEdit(false);
    Keyboard.dismiss();
  };

  async function handleSave() {
    if (!hasChanges || !emailValid) return;
    try {
      setSaving(true);
      const res = await fetch(`${BACKEND_URL}/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          ...(username.trim() !== user.username
            ? { username: username.trim() }
            : {}),
          ...(email.trim() !== user.email
            ? { email: email.trim().toLowerCase() }
            : {}),
        }),
      });
      const data = await res.json();
      if (!data?.result) {
        Alert.alert("Échec", data?.error || "Erreur inconnue");
        return;
      }
      dispatch(
        updateUser({ username: data.user?.username, email: data.user?.email })
      );
      setEdit(false);
      Alert.alert("OK", "Profil mis à jour.");
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour.");
    } finally {
      setSaving(false);
    }
  }

  const handleLogout = () => {
    dispatch(logoutUser());
    navigation?.reset?.({ index: 0, routes: [{ name: "Connexion" }] });
  };

  async function handleDelete() {
    const url = `${BACKEND_URL}/users`;
    if (!user?.token)
      return Alert.alert("Erreur", "Token manquant (reconnecte-toi).");

    Alert.alert("Supprimer le compte", "Action irréversible, confirmer ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            const res = await fetch(url, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${user.token}`, // 1) header
              },
              body: JSON.stringify({ token: user.token }), // 2) body (fallback serveur)
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data?.result) {
              Alert.alert(
                "Échec suppression",
                `Status: ${res.status}\n${JSON.stringify(data)}`
              );
              return;
            }

            dispatch(logoutUser());
            navigation?.reset?.({ index: 0, routes: [{ name: "Connexion" }] });
          } catch (e) {
            Alert.alert("Erreur réseau", String(e?.message || e));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.wrap}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Profil de {user.username || "—"}</Text>
          <Text style={styles.subtitle}>
            {edit ? "Modifie tes infos" : "Tes informations personnelles"}
          </Text>

          {!edit ? (
            <View style={styles.card}>
              <Row label="Nom d’utilisateur" value={user.username || "—"} />
              <Row label="Email" value={user.email || "—"} />
              <CustomButton
                btnTitle="Modifier"
                clickNav={enterEdit}
                userStyle={BTN.primary}
              />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {/* ⚠️ TES PROPS: setText / text / placeholder / name */}
              <CustomInput
                name="Nom d’utilisateur"
                placeholder="Ton pseudo"
                text={username}
                setText={setUsername}
                width="100%"
              />
              <CustomInput
                name="Email"
                placeholder="ton@email.com"
                text={email}
                setText={setEmail}
                width="100%"
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <CustomButton
                  btnTitle={saving ? "Enregistrement..." : "Enregistrer"}
                  clickNav={handleSave}
                  userStyle={[BTN.primary, { flex: 1 }]}
                />
                <CustomButton
                  btnTitle="Annuler"
                  clickNav={cancelEdit}
                  userStyle={[BTN.outline, { flex: 1 }]}
                  textStyle={{ color: "#111" }}
                />
              </View>
            </View>
          )}

          <View style={styles.divider} />

          <CustomButton
            btnTitle="Se déconnecter"
            clickNav={handleLogout}
            userStyle={BTN.outline}
            textStyle={{ color: "#111" }} // évite texte noir sur fond noir
          />
          <CustomButton
            btnTitle={deleting ? "Suppression..." : "Supprimer mon compte"}
            clickNav={handleDelete}
            userStyle={BTN.danger}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ label, value }) {
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>
        {value}
      </Text>
    </View>
  );
}

const BTN = StyleSheet.create({
  primary: {
    backgroundColor: "#111", // écrase le noir par défaut si besoin
    borderRadius: 10,
  },
  outline: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111",
  },
  danger: {
    backgroundColor: "#e02424",
    borderRadius: 10,
  },
});

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 32, gap: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#111" },
  subtitle: { color: "#666" },
  card: {
    borderRadius: 14,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#eee",
    padding: 16,
    gap: 14,
  },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 12 },
});
