import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, PermissionsAndroid, Platform, Alert, Modal, TextInput, Animated, ScrollView } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import { getDistance } from 'geolib'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function RecordScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [segments, setSegments] = useState([]);
  
  const [sportType, setSportType] = useState('run'); // 'run', 'bike', 'walk'

  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [markerPosition, setMarkerPosition] = useState({ latitude: 47.4784, longitude: -0.5638 });
  const [modalVisible, setModalVisible] = useState(false);
  const [activityName, setActivityName] = useState('');

  const mapRef = useRef(null);
  const timerRef = useRef(null);
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          if (granted === PermissionsAndroid.RESULTS.GRANTED) setHasPermission(true);
        } catch (err) { console.warn(err); }
      } else { setHasPermission(true); }
    };
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: isRecording ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isRecording]);

  const startRecording = () => {
    setDistance(0);
    setDuration(0);
    setSegments([{ type: 'run', coordinates: [] }]);
    setIsRecording(true);
    setIsPaused(false);
  };

  const togglePause = () => {
    const newStatus = !isPaused;
    setIsPaused(newStatus);

    setSegments(prevSegments => {
      const lastSegment = prevSegments[prevSegments.length - 1];
      const lastPoint = lastSegment && lastSegment.coordinates.length > 0 
        ? [lastSegment.coordinates[lastSegment.coordinates.length - 1]] 
        : [];

      return [...prevSegments, { type: newStatus ? 'pause' : 'run', coordinates: lastPoint }];
    });
  };

  const handleStopPress = () => {
    setIsRecording(false);
    setIsPaused(false);
    const timeOfDay = new Date().getHours();
    const period = timeOfDay < 12 ? 'matin' : timeOfDay < 18 ? 'après-midi' : 'soir';
    
    let typeLabel = "Sortie";
    if (sportType === 'run') typeLabel = "Course";
    else if (sportType === 'bike') typeLabel = "Vélo";
    else if (sportType === 'walk') typeLabel = "Marche";

    const defaultName = `${typeLabel} du ${period}`;
    setActivityName(defaultName);
    setModalVisible(true);
  };

  const saveActivity = async () => {
    const allCoordinates = segments.flatMap(s => s.coordinates);

    const newActivity = {
      id: Date.now().toString(),
      name: activityName,
      date: new Date().toISOString(),
      distance: distance,
      duration: duration,
      segments: segments,
      coordinates: allCoordinates,
      avgSpeed: duration > 0 ? (distance / 1000) / (duration / 3600) : 0,
      sportType: sportType,
    };

    try {
      const existingHistory = await AsyncStorage.getItem('activities');
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      history.unshift(newActivity);
      await AsyncStorage.setItem('activities', JSON.stringify(history));
      setModalVisible(false);
      Alert.alert("Succès", "Activité enregistrée !", [{ text: "OK", onPress: () => {
        setSegments([]); setDistance(0); setDuration(0);
      }}]);
    } catch (e) { console.error(e); }
  };

  const handleUserLocationChange = (e) => {
    const newCoords = e.nativeEvent.coordinate;
    const speedFromGps = e.nativeEvent.speed;

    if (newCoords) {
      setMarkerPosition(newCoords);
      mapRef.current?.animateCamera({ center: newCoords, zoom: 17 }, { duration: 500 });

      if (isRecording) {
        setSegments(prevSegments => {
          const updatedSegments = [...prevSegments];
          const currentSegmentIndex = updatedSegments.length - 1;
          const currentSegment = { ...updatedSegments[currentSegmentIndex] };
          
          currentSegment.coordinates = [...currentSegment.coordinates, newCoords];
          updatedSegments[currentSegmentIndex] = currentSegment;

          if (currentSegment.type === 'run' && currentSegment.coordinates.length > 1) {
            const lastPoint = currentSegment.coordinates[currentSegment.coordinates.length - 2];
            const addedDist = getDistance(lastPoint, newCoords);
            if (addedDist > 3) setDistance(prev => prev + addedDist);
          }
          return updatedSegments;
        });
        if (speedFromGps && speedFromGps >= 0) setCurrentSpeed((speedFromGps * 3.6).toFixed(1));
      }
    }
  };

  const formatDuration = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const startOpacity = animValue.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const startScale = animValue.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] });
  const controlsOpacity = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const controlsScale = animValue.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  const controlsTranslateY = animValue.interpolate({ inputRange: [0, 1], outputRange: [50, 0] });

  const sports = [
    { key: 'run', label: 'Course', icon: 'walk-outline' },
    { key: 'bike', label: 'Vélo', icon: 'bicycle-outline' },
    { key: 'walk', label: 'Marche', icon: 'footsteps-outline' },
  ];

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{ latitude: 47.4784, longitude: -0.5638, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        showsUserLocation={true}
        onUserLocationChange={handleUserLocationChange}
      >
        {segments.map((segment, index) => (
          <Polyline 
            key={index}
            coordinates={segment.coordinates}
            strokeColor={segment.type === 'run' ? "#FC4C02" : "#888"}
            strokeWidth={4}
            lineDashPattern={segment.type === 'pause' ? [10, 10] : null}
          />
        ))}
        <Marker coordinate={markerPosition} title="Moi" pinColor="tomato" />
      </MapView>

      {isPaused && (
        <View style={styles.pauseOverlay}>
            <Text style={styles.pauseText}>PAUSE</Text>
            <Text style={styles.pauseSubText}>Appuyez sur play pour reprendre</Text>
        </View>
      )}

      <View style={[styles.statsContainer, isPaused && styles.statsContainerPaused]}>
        <View style={styles.statBox}>
            <Text style={styles.statLabel}>DISTANCE (m)</Text>
            <Text style={[styles.statValue, isPaused && styles.statValuePaused]}>{distance}</Text>
        </View>
        <View style={styles.statBox}>
            <Text style={styles.statLabel}>DURÉE</Text>
            <Text style={[styles.statValue, isPaused && styles.statValuePaused]}>{formatDuration(duration)}</Text>
        </View>
        <View style={styles.statBox}>
            <Text style={styles.statLabel}>VITESSE</Text>
            <Text style={[styles.statValue, isPaused && styles.statValuePaused]}>{currentSpeed}</Text>
        </View>
      </View>

      <View style={styles.controlsArea}>
        
        <Animated.View style={[styles.controlWrapper, { opacity: startOpacity, transform: [{ scale: startScale }], zIndex: isRecording ? 0 : 1 }]}>
          
          <View style={styles.sportSelector}>
            {sports.map((sport) => (
                <TouchableOpacity 
                    key={sport.key} 
                    style={[styles.sportBtn, sportType === sport.key && styles.sportBtnActive]}
                    onPress={() => setSportType(sport.key)}
                >
                    <Ionicons name={sport.icon} size={20} color={sportType === sport.key ? 'white' : '#555'} />
                    <Text style={[styles.sportBtnText, sportType === sport.key && styles.sportBtnTextActive]}>{sport.label}</Text>
                </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.btnCircleLarge} onPress={startRecording} disabled={isRecording}>
            <Ionicons name="play" size={40} color="white" style={{ marginLeft: 5 }} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.controlWrapper, styles.rowControls, { opacity: controlsOpacity, transform: [{ scale: controlsScale }, { translateY: controlsTranslateY }], zIndex: isRecording ? 1 : 0 }]}>
             <TouchableOpacity 
                style={[styles.btnCircleMedium, { backgroundColor: isPaused ? '#4CD964' : '#FC4C02' }]} 
                onPress={togglePause} 
                disabled={!isRecording}
             >
                <Ionicons name={isPaused ? "play" : "pause"} size={35} color="white" style={isPaused ? {marginLeft:4} : {}} />
             </TouchableOpacity>
             
             <TouchableOpacity style={[styles.btnCircleMedium, { backgroundColor: '#333' }]} onPress={handleStopPress} disabled={!isRecording}>
                <Ionicons name="square" size={28} color="white" />
             </TouchableOpacity>
        </Animated.View>
      </View>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Nommez votre activité</Text>
            <TextInput style={styles.input} onChangeText={setActivityName} value={activityName} autoFocus={true} />
            <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.button, styles.buttonClose]} onPress={() => setModalVisible(false)}><Text style={styles.textStyle}>Annuler</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.buttonSave]} onPress={saveActivity}><Text style={styles.textStyle}>Enregistrer</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  statsContainer: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', padding: 15, borderRadius: 12, elevation: 4 },
  statsContainerPaused: { backgroundColor: '#E0E0E0', borderColor: '#999', borderWidth: 1 },
  statBox: { alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#888', fontWeight: 'bold' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  statValuePaused: { color: '#777' },
  pauseOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 2, paddingBottom: 100 },
  pauseText: { fontSize: 40, fontWeight: '900', color: '#333', letterSpacing: 5 },
  pauseSubText: { fontSize: 16, color: '#555', marginTop: 10, fontWeight: '600' },
  controlsArea: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center', height: 180, justifyContent: 'flex-end', zIndex: 10 },
  controlWrapper: { position: 'absolute', width: '100%', alignItems: 'center', justifyContent: 'center', bottom: 0 },
  rowControls: { flexDirection: 'row', justifyContent: 'space-evenly', width: '70%', bottom: 20 },
  btnCircleLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FC4C02', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 },
  btnCircleMedium: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4 },
  
  sportSelector: { flexDirection: 'row', backgroundColor: 'white', padding: 5, borderRadius: 25, elevation: 3, marginBottom: 20 },
  sportBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  sportBtnActive: { backgroundColor: '#FC4C02' },
  sportBtnText: { marginLeft: 5, fontWeight: 'bold', color: '#555', fontSize: 12 },
  sportBtnTextActive: { color: 'white' },

  centeredView: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { width: '80%', backgroundColor: "white", borderRadius: 20, padding: 35, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalText: { marginBottom: 15, textAlign: "center", fontSize: 18, fontWeight: 'bold' },
  input: { height: 40, width: '100%', borderColor: 'gray', borderWidth: 1, borderRadius: 5, marginBottom: 20, paddingHorizontal: 10 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  button: { borderRadius: 10, padding: 10, elevation: 2, minWidth: 100, alignItems: 'center' },
  buttonClose: { backgroundColor: "#888" },
  buttonSave: { backgroundColor: "#FC4C02" },
  textStyle: { color: "white", fontWeight: "bold", textAlign: "center" }
});