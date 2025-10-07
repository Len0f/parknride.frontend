import { TextInput, View, StyleSheet, Text } from "react-native";
import { useState } from "react";

export default function CustomInput(props) {
  const [actif, setActif] = useState(false); // état pour savoir si le champ est actif

  const handleClick = () => {
    if (props.text != "") {
      return;
    }
    setActif(!actif);
  };

  // Définit le titre à afficher : placeholder prioritaire sinon "name"
  let titre = props.placeholder;
  if (!props.placeholder) {
    titre = props.name;
  }

  return (
    <View style={styles.container} width={props.width}>
      {/* Label flottant affiché uniquement si le champ est actif */}
      {actif ? (
        <View style={styles.containLabel}>
          <Text style={[styles.label, props.userStyle]}>{props.name}</Text>
        </View>
      ) : null}
      {/* Champ de saisie */}
      <TextInput
        style={styles.textInput}
        secureTextEntry={props.type} // mode sécurisé si besoin (ex: password)
        onFocus={() => handleClick()} // active le label
        onBlur={() => handleClick()} // désactive le label si champ vide
        maxLength={280}
        placeholder={titre} // texte par défaut
        placeholderTextColor={"#979797"}
        onChangeText={(value) => props.setText(value)} // renvoie la valeur au parent
        value={props.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    paddingTop: 15,
    alignItems: "flex-start",
    justifyContent: "center",
    position: "relative",
  },
  textInput: {
    height: 60,
    width: "100%",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    paddingLeft: 18,
    fontSize: 18,
  },
  label: {
    height: 20,
    width: "100%",
    textAlign: "left",
    margin: 5,
    zIndex: 1,
    fontWeight: "bold",
    color: "#ffffff",
  },
  containLabel: {
    padding: 0,
    margin: 0,
    backgroundColor: "#000000",
    borderRadius: 50,
    position: "absolute",
    top: 0,
    left: 15,
    zIndex: 1,
  },
});
