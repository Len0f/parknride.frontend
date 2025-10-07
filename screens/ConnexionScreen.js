// screens/ConnexionScreen.js
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch } from "react-redux";
import { loginUser } from "../reducers/user";
import CustomInput from "../components/CustomInput";
import CustomButton from "../components/CustomButton";

export default function ConnexionScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const dispatch = useDispatch();

  const handleConnexion = () => {
    setError(null);

    if (!email || !password) {
      setError("Email et mot de passe sont requis.");
      return;
    }

    const BACKEND_URL = "http://10.0.0.10:3000/users/signin";

    fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then((response) => response.json())
      .then((dataUser) => {
        if (dataUser.result) {
          const u = dataUser.user; // { _id, username, email, token }
          dispatch(
            loginUser({
              _id: u._id,
              username: u.username,
              email: u.email,
              token: u.token,
            })
          );
          navigation.replace("TabNavigator");
        } else {
          setError(dataUser.error || "Connexion échouée.");
        }
      })
      .catch((e) => {
        setError(e?.message || "Impossible de joindre le serveur.");
      });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Connexion</Text>

        <CustomInput
          name="Email"
          placeholder="Adresse email"
          text={email}
          setText={setEmail}
          width={"100%"}
        />

        <CustomInput
          name="Mot de passe"
          placeholder="Mot de passe"
          text={password}
          setText={setPassword}
          type
          width={"100%"}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <CustomButton
          btnTitle={"Se connecter"}
          clickNav={handleConnexion}
          userStyle={styles.submit}
          textStyle={styles.submitText}
        />

        <TouchableOpacity onPress={() => navigation.navigate("Inscription")}>
          <Text style={styles.link}>Pas de compte ? S'inscrire</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  form: { flex: 1, padding: 20, justifyContent: "center" },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  error: { color: "#d00", marginTop: 8, marginBottom: 4, textAlign: "center" },
  submit: { marginTop: 16 },
  submitText: { fontSize: 18 },
  link: { marginTop: 16, textAlign: "center", color: "#007BFF" },
});
