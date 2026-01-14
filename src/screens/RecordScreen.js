import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, PermissionsAndroid, Platform, Alert } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import { getDistance } from 'geolib'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RecordScreen({ navigation }) {
  // --- ÉTATS (DATA) ---
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Stats de la course
  const [duration, setDuration] = useState(0);      // en secondes
  const [distance, setDistance] = useState(0);      // en mètres
  const [routeCoordinates, setRouteCoordinates] = useState([]); // Liste des points pour le tracé
  const [currentSpeed, setCurrentSpeed] = useState(0); // km/h

  // Position actuelle pour le Marker
  const [markerPosition, setMarkerPosition] = useState({
    latitude: 47.4784, longitude: -0.5638,
  });

  // --- REFS ---
  const mapRef = useRef(null);
  const timerRef = useRef(null); // Pour stocker l'intervalle du chrono

  // --- 1. PERMISSIONS ---
  useEffect(() => {
    const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) setHasPermission(true);
        } catch (err) { console.warn(err); }
      } else { setHasPermission(true); }
    };
    requestLocationPermission();
  }, []);

  // --- 2. GESTION DU CHRONOMÈTRE ---
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  // --- 3. FONCTIONS START / STOP ---
  const startRecording = () => {
    setDistance(0);
    setDuration(0);
    setRouteCoordinates([]);
    setIsRecording(true);
  };

  const stopRecording = async () => {
    setIsRecording(false);
    
    // Création de l'objet "Activité"
    const newActivity = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      distance: distance, // mètres
      duration: duration, // secondes
      coordinates: routeCoordinates, // Le tracé complet
      avgSpeed: duration > 0 ? (distance / 1000) / (duration / 3600) : 0, // km/h
    };

    // Sauvegarde dans AsyncStorage
    try {
      const existingHistory = await AsyncStorage.getItem('activities');
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      history.unshift(newActivity); // Ajoute au début de la liste
      await AsyncStorage.setItem('activities', JSON.stringify(history));

      Alert.alert("Terminé !", "Activité enregistrée avec succès.", [
        { text: "OK", onPress: () => {
            // Optionnel : Reset visuel ou navigation vers l'historique
            setRouteCoordinates([]); 
            setDistance(0);
            setDuration(0);
        }}
      ]);
    } catch (e) {
      console.error("Erreur de sauvegarde", e);
    }
  };

  // --- 4. SUIVI GPS (Moteur principal) ---
  const handleUserLocationChange = (e) => {
    const newCoords = e.nativeEvent.coordinate;
    const speedFromGps = e.nativeEvent.speed; // Vitesse renvoyée par le GPS (m/s)

    if (newCoords) {
      setMarkerPosition(newCoords);

      // Animation fluide de la caméra
      mapRef.current?.animateCamera({ center: newCoords, zoom: 17 }, { duration: 500 });

      // SI on enregistre, on ajoute les points et on calcule
      if (isRecording) {
        setRouteCoordinates(prevRoute => {
          const newRoute = [...prevRoute, newCoords];
          
          // Calcul distance ajouté depuis le dernier point
          if (prevRoute.length > 0) {
            const lastPoint = prevRoute[prevRoute.length - 1];
            // getDistance vient de 'geolib'
            const addedDist = getDistance(lastPoint, newCoords); 
            
            // On ignore les mouvements minimes (< 3m) pour éviter le "bruit" GPS quand on est à l'arrêt
            if (addedDist > 3) {
                setDistance(prev => prev + addedDist);
            }
          }
          return newRoute;
        });

        // Mise à jour vitesse (si dispo, sinon 0) -> conversion m/s en km/h
        if (speedFromGps && speedFromGps >= 0) {
            setCurrentSpeed((speedFromGps * 3.6).toFixed(1));
        }
      }
    }
  };

  // Formatage mm:ss pour l'affichage
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 47.4784, longitude: -0.5638,
          latitudeDelta: 0.01, longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onUserLocationChange={handleUserLocationChange}
      >
        {/* Le tracé orange de l'activité en cours */}
        {routeCoordinates.length > 0 && (
            <Polyline coordinates={routeCoordinates} strokeColor="#FC4C02" strokeWidth={4} />
        )}

        <Marker coordinate={markerPosition} title="Moi" pinColor="tomato" />
      </MapView>

      {/* --- HUD (Affichage Stats) --- */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
            <Text style={styles.statLabel}>DISTANCE (m)</Text>
            <Text style={styles.statValue}>{distance}</Text>
        </View>
        <View style={styles.statBox}>
            <Text style={styles.statLabel}>DURÉE</Text>
            <Text style={styles.statValue}>{formatTime(duration)}</Text>
        </View>
        <View style={styles.statBox}>
            <Text style={styles.statLabel}>VITESSE (km/h)</Text>
            <Text style={styles.statValue}>{currentSpeed}</Text>
        </View>
      </View>

      {/* --- Boutons Start / Stop --- */}
      <View style={styles.controlsContainer}>
        {!isRecording ? (
          <TouchableOpacity style={[styles.btn, styles.btnStart]} onPress={startRecording}>
            <Text style={styles.btnText}>DÉMARRER</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnStop]} onPress={stopRecording}>
            <Text style={styles.btnText}>STOP & SAUVER</Text>
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  
  statsContainer: {
    position: 'absolute', top: 50, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: 'white', padding: 15, borderRadius: 12,
    elevation: 4, // Ombre Android
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, // Ombre iOS
  },
  statBox: { alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#888', fontWeight: 'bold' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },

  controlsContainer: {
    position: 'absolute', bottom: 30, width: '100%', alignItems: 'center',
  },
  btn: {
    paddingVertical: 18, paddingHorizontal: 50, borderRadius: 30, elevation: 5
  },
  btnStart: { backgroundColor: '#FC4C02' }, // Orange Strava
  btnStop: { backgroundColor: '#333' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }
});