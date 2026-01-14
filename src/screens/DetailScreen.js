import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Keyboard } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline, Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function DetailScreen({ route, navigation }) {
  const { activity } = route.params;
  const mapRef = useRef(null);

  const [name, setName] = useState(activity.name || "Sortie sans nom");
  const [isEditing, setIsEditing] = useState(false);

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
        if (item.id === activity.id) {
          return { ...item, name: name };
        }
        return item;
      });

      await AsyncStorage.setItem('activities', JSON.stringify(updatedHistory));
      
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible de sauvegarder le nom.");
    }
  };

  const dateStr = new Date(activity.date).toLocaleDateString('fr-FR');
  const durationStr = `${Math.floor(activity.duration / 60)} min ${activity.duration % 60} s`;

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
          <Polyline coordinates={activity.coordinates} strokeColor="#FC4C02" strokeWidth={4} />
          {activity.coordinates.length > 0 && <Marker coordinate={activity.coordinates[0]} pinColor="green" title="Départ" />}
          {activity.coordinates.length > 0 && <Marker coordinate={activity.coordinates[activity.coordinates.length - 1]} title="Arrivée" />}
        </MapView>
      </View>

      <View style={styles.detailsContainer}>
        
        <View style={styles.titleContainer}>
          {isEditing ? (
            <View style={styles.editRow}>
                <TextInput 
                    style={styles.input} 
                    value={name} 
                    onChangeText={setName} 
                    autoFocus 
                />
                <TouchableOpacity onPress={saveNameChange} style={styles.saveBtn}>
                    <Text style={{color:'white', fontWeight:'bold'}}>OK</Text>
                </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.displayRow} onPress={() => setIsEditing(true)}>
                <Text style={styles.title}>{name}</Text>
                <Ionicons name="pencil" size={20} color="#888" style={{marginLeft: 10}} />
            </TouchableOpacity>
          )}
          <Text style={styles.subtitle}>Sortie du {dateStr}</Text>
        </View>

        <View style={styles.row}><Text style={styles.label}>Distance : </Text><Text style={styles.value}>{(activity.distance / 1000).toFixed(2)} km</Text></View>
        <View style={styles.row}><Text style={styles.label}>Durée : </Text><Text style={styles.value}>{durationStr}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Vitesse Moy. : </Text><Text style={styles.value}>{activity.avgSpeed ? Number(activity.avgSpeed).toFixed(1) : 0} km/h</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  mapContainer: { flex: 0.6 },
  map: { ...StyleSheet.absoluteFillObject },
  detailsContainer: { flex: 0.4, padding: 20 },
  
  titleContainer: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  displayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { textAlign: 'center', color: '#888', marginTop: 5 },
  
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  input: { borderBottomWidth: 1, borderColor: '#FC4C02', fontSize: 20, width: '70%', padding: 5, textAlign: 'center' },
  saveBtn: { backgroundColor: '#FC4C02', padding: 10, borderRadius: 5, marginLeft: 10 },

  row: { flexDirection: 'row', marginBottom: 10, alignItems: 'center' },
  label: { fontSize: 16, color: '#666', width: 120 },
  value: { fontSize: 18, fontWeight: 'bold', color: '#000' }
});