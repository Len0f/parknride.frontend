import { Text, TouchableOpacity, StyleSheet } from "react-native";

export default function CustomButton(props) {
  const handleClick = () => {
    if (props.disabled) return;
    if (typeof props.clickNav === "function") props.clickNav();
  };

  // Contenu du bouton :
  // - si c’est une string, on la rend dans <Text>
  // - sinon on affiche directement (ex: une icône FontAwesome)
  const content =
    typeof props.btnTitle === "string" ? (
      <Text style={[styles.text, props.textStyle]}>{props.btnTitle}</Text>
    ) : (
      props.btnTitle
    ); // pour faire <view>FontAwersome.../></view>

  return (
    <TouchableOpacity
      disabled={props.disabled}
      style={[styles.btnContainer, props.userStyle]}
      onPress={() => handleClick()}
      accessibilityRole="button"
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btnContainer: {
    backgroundColor: "#000000",
    alignItems: "center",
    padding: 15,
    width: "100%",
  },
  text: {
    fontSize: 22,
    color: "#ffffff",
    fontWeight: "800",
  },
});
