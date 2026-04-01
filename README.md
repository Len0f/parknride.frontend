# Park'n'Ride — Frontend

Application mobile de recherche de parkings a velo a proximite, developee avec React Native et Expo. Utilise la geolocalisation de l'appareil et une API externe pour afficher les parkings disponibles sur une carte interactive.

## Technologies

- **Framework** : React Native 0.81 / Expo 54
- **Navigation** : React Navigation (stack + bottom tabs)
- **Carte** : react-native-maps, react-native-map-clustering
- **Geolocalisation** : expo-location
- **Etat global** : Redux Toolkit, React-Redux, Redux Persist
- **Langage** : JavaScript

## Fonctionnalites

- Geolocalisation de l'utilisateur en temps reel
- Affichage des parkings velo sur une carte interactive
- Clustering des marqueurs pour une meilleure lisibilite
- Navigation par onglets
- Persistance de l'etat utilisateur entre les sessions
- Compatible iOS et Android

## Structure du projet

- `components/` — Composants React Native réutilisables
- `screens/` — Ecrans de l'application
- `reducers/` — Reducers Redux
- `App.js` — Point d'entrée de l'application

## Backend

Ce projet communique avec une API REST dédiée :  
[github.com/Len0f/parknride.backend](https://github.com/Len0f/parknride.backend)

## Auteur

**Caroline Viot** — Développeuse web fullstack JS  
[GitHub](https://github.com/Len0f)
