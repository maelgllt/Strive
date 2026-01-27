import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline, Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';

export default function DetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const { activity } = route.params;
  const mapRef = useRef(null);

  const [name, setName] = useState(activity.name || "Sortie sans nom");
  const [isEditing, setIsEditing] = useState(false);
  const segmentsToDisplay = activity.segments || [{ type: 'run', coordinates: activity.coordinates }];

  useEffect(() => {
    if (activity.coordinates && activity.coordinates.length > 0) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(activity.coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }, 500);
    }
  }, [activity]);

  const saveNameChange = async () => {
    setIsEditing(false);
    try {
      const existingHistory = await AsyncStorage.getItem('activities');
      let history = existingHistory ? JSON.parse(existingHistory) : [];

      const updatedHistory = history.map(item => {
        if (item.id === activity.id) return { ...item, name: name };
        return item;
      });

      await AsyncStorage.setItem('activities', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible de sauvegarder le nom.");
    }
  };

  const getSportIcon = (type) => {
    switch(type) {
        case 'bike': return 'bicycle-outline';
        case 'walk': return 'footsteps-outline';
        case 'run': default: return 'walk-outline';
    }
  };

  const dateStr = new Date(activity.date).toLocaleDateString('fr-FR');
  
  const formatDuration = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const durationLabel = formatDuration(activity.duration);

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: activity.coordinates[0]?.latitude || 47.0,
            longitude: activity.coordinates[0]?.longitude || -0.5,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {segmentsToDisplay.map((segment, index) => (
            <Polyline 
                key={index}
                coordinates={segment.coordinates}
                strokeColor={segment.type === 'run' ? "#FC4C02" : "#888"}
                strokeWidth={4}
                lineDashPattern={segment.type === 'pause' ? [10, 10] : null}
            />
          ))}

          {activity.coordinates.length > 0 && <Marker coordinate={activity.coordinates[0]} pinColor="green" title="Départ" />}
          {activity.coordinates.length > 0 && <Marker coordinate={activity.coordinates[activity.coordinates.length - 1]} title="Arrivée" />}
        </MapView>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.titleContainer}>
          <View style={styles.sportTag}>
             <Ionicons name={getSportIcon(activity.sportType)} size={16} color="white" />
             <Text style={styles.sportTagText}>{activity.sportType === 'bike' ? 'Vélo' : activity.sportType === 'walk' ? 'Marche' : 'Course'}</Text>
          </View>

          {isEditing ? (
            <View style={styles.editRow}>
                <TextInput style={styles.input} value={name} onChangeText={setName} autoFocus />
                <TouchableOpacity onPress={saveNameChange} style={styles.saveBtn}><Text style={{color:'white', fontWeight:'bold'}}>OK</Text></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.displayRow} onPress={() => setIsEditing(true)}>
                <Text style={styles.title}>{name}</Text>
                <Ionicons name="pencil" size={18} color="#999" style={{marginLeft: 8}} />
            </TouchableOpacity>
          )}
          <Text style={styles.subtitle}>{dateStr}</Text>
        </View>

        <View style={styles.statsGrid}>
            <View style={styles.statItem}>
                <View style={styles.iconCircle}><Ionicons name="map-outline" size={24} color="#FC4C02" /></View>
                <Text style={styles.statValue}>{(activity.distance / 1000).toFixed(2)}</Text>
                <Text style={styles.statUnit}>km</Text>
            </View>

            <View style={styles.statItem}>
                <View style={styles.iconCircle}><Ionicons name="time-outline" size={24} color="#FC4C02" /></View>
                <Text style={styles.statValue}>{durationLabel}</Text>
                <Text style={styles.statUnit}>h:m:s</Text>
            </View>

            <View style={styles.statItem}>
                <View style={styles.iconCircle}><Ionicons name="speedometer-outline" size={24} color="#FC4C02" /></View>
                <Text style={styles.statValue}>{activity.avgSpeed ? Number(activity.avgSpeed).toFixed(1) : 0}</Text>
                <Text style={styles.statUnit}>km/h</Text>
            </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  mapContainer: { flex: 0.55 },
  map: { ...StyleSheet.absoluteFillObject },
  detailsContainer: { flex: 0.45, padding: 20, borderTopLeftRadius: 25, borderTopRightRadius: 25, marginTop: -20, backgroundColor: 'white', elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5 },
  titleContainer: { marginBottom: 25, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 15, alignItems: 'center' },
  
  sportTag: { flexDirection: 'row', backgroundColor: '#FC4C02', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  sportTagText: { color: 'white', fontWeight: 'bold', fontSize: 12, marginLeft: 5, textTransform: 'uppercase' },
  
  displayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#222', textAlign: 'center' },
  subtitle: { textAlign: 'center', color: '#888', marginTop: 4, fontSize: 14 },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  input: { borderBottomWidth: 1, borderColor: '#FC4C02', fontSize: 18, width: '60%', padding: 5, textAlign: 'center' },
  saveBtn: { backgroundColor: '#FC4C02', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginLeft: 10 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  statItem: { alignItems: 'center', width: '30%' },
  iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF0E6', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  statUnit: { fontSize: 14, color: '#999', fontWeight: '600' }
});