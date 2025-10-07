import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { registerUser } from "../reducers/user";
import CustomInput from "../components/CustomInput";
import CustomButton from "../components/CustomButton";

export default function InscriptionScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);

  const dispatch = useDispatch();

  const handleInscription = async () => {
    setError(null);

    // Validations minimales
    if (password !== confirmPassword) {
      setError("Les mots de passe doivent être identiques.");
      return;
    }

    const BACKEND_URL = "https://parknride-backend.vercel.app/users/signup";

    // Appel API backend -> création de compte
    fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    })
      .then((response) => response.json())
      .then((dataUser) => {
        if (dataUser.result) {
          // Pose _id, username, email, token dans Redux
          const u = dataUser.user;
          dispatch(
            registerUser({
              _id: u._id,
              username: u.username,
              email: u.email,
              token: u.token,
            })
          );
          navigation.replace("TabNavigator");
        } else {
          // Affiche un message d’erreur lisible à l’utilisateur
          setError(dataUser.error || `Erreur inconnue lors de l'inscription`);
        }
      });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Inscription</Text>

        <CustomInput
          name="Pseudo"
          placeholder="Votre pseudo"
          text={username}
          setText={setUsername}
          width={"100%"}
        />

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

        <CustomInput
          name="Confirmer le mot de passe"
          placeholder="Confirmer le mot de passe"
          text={confirmPassword}
          setText={setConfirmPassword}
          type
          width={"100%"}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <CustomButton
          btnTitle={"S'inscrire"}
          clickNav={handleInscription}
          userStyle={styles.submit}
          textStyle={styles.submitText}
        />

        <TouchableOpacity onPress={() => navigation.navigate("Connexion")}>
          <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  form: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
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
